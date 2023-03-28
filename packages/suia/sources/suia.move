module suia::suia {
    use std::string::{String, utf8};
    use std::vector;
    use sui::object::{Self, ID, UID};
    use sui::tx_context::{Self, TxContext, sender};
    use sui::vec_set::{Self, VecSet};
    use sui::transfer;
    use sui::table::{Self, Table};
    #[test_only]
    use sui::test_scenario;
    use sui::package;
    use sui::display;

    // errors
    const ESENDER_NOT_AUTHORIZED_TO_CLAIM: u64 = 0;
    const EMEDAL_MAX_AMOUNT_REACHED: u64 = 1;
    const EALREADY_CLAIMED: u64 = 2;

    struct SUIA has drop {}

    struct MedalStore has key, store {
        id: UID,
        medals: Table<u64, ID>
    }

    struct Medal has key, store {
        id: UID,
        name: String,
        description: String,
        image_url: String,
        max_amount: u64,
        whitelist: VecSet<address>,
        owners: Table<address, bool>,
        creator: address,
    }

    struct PersonalMedal has key, store {
        id: UID,
        name: String,
        description: String,
        image_url: String,
        medal: ID,
    }

    fun init(otw: SUIA, ctx: &mut TxContext) {
        create_medal_store(ctx);

        let publisher = package::claim(otw, ctx);

        let medal_keys = vector[
            utf8(b"name"),
            utf8(b"link"),
            utf8(b"image_url"),
            utf8(b"description"),
            utf8(b"project_url"),
            utf8(b"creator"),
        ];
        let medal_values = vector[
            utf8(b"{name}"),
            utf8(b"https://suia.io/suia/{id}"),
            utf8(b"{image_url}"),
            utf8(b"{description}"),
            utf8(b"https://suia.io/"),
            utf8(b"{creator}"),
        ];
        let medal_display = display::new_with_fields<Medal>(
            &publisher, medal_keys, medal_values, ctx
        );
        display::update_version(&mut medal_display);
        transfer::public_transfer(medal_display, sender(ctx));

        let personal_medal_keys = vector[
            utf8(b"name"),
            utf8(b"link"),
            utf8(b"image_url"),
            utf8(b"description"),
            utf8(b"project_url"),
        ];
        let personal_medal_values = vector[
            utf8(b"{name}"),
            utf8(b"https://suia.io/suia/{id}"),
            utf8(b"{image_url}"),
            utf8(b"{description}"),
            utf8(b"https://suia.io/"),
        ];
        let personal_medal_display = display::new_with_fields<PersonalMedal>(
            &publisher, personal_medal_keys, personal_medal_values, ctx
        );
        display::update_version(&mut personal_medal_display);
        transfer::public_transfer(personal_medal_display, sender(ctx));

        transfer::public_transfer(publisher, sender(ctx));
    }

    fun create_medal_store(
        ctx: &mut TxContext,
    ) {
        let store = MedalStore {
            id: object::new(ctx),
            medals: table::new(ctx),
        };
        transfer::share_object(store)
    }

    public entry fun create_medal(
        medal_store: &mut MedalStore,
        name: vector<u8>,
        description: vector<u8>,
        max_amount: u64,
        whitelist: vector<address>,
        image_url: vector<u8>,
        ctx: &mut TxContext,
    ) {
        let medal = Medal {
            id: object::new(ctx),
            name: utf8(name),
            description: utf8(description),
            image_url: utf8(image_url),
            max_amount,
            whitelist: vec_set::empty(),
            owners: table::new(ctx),
            creator: tx_context::sender(ctx),
        };
        let len = vector::length(&whitelist);
        let i = 0;
        while (i < len) {
            vec_set::insert(&mut medal.whitelist, *vector::borrow(&whitelist, i));
            i = i + 1;
        };
        let medal_key = table::length(&medal_store.medals);
        table::add(&mut medal_store.medals, medal_key, object::uid_to_inner(&medal.id));
        transfer::share_object(medal);
    }

    public entry fun claim_medal(
        medal: &mut Medal,
        ctx: &mut TxContext,
    ) {
        let sender = tx_context::sender(ctx);
        assert!(
            vec_set::is_empty(&medal.whitelist) || vec_set::contains(&medal.whitelist, &sender),
            ESENDER_NOT_AUTHORIZED_TO_CLAIM
        );
        assert!(table::length(&medal.owners) < medal.max_amount, EMEDAL_MAX_AMOUNT_REACHED);
        assert!(!table::contains(&medal.owners, sender), EALREADY_CLAIMED);
        table::add(&mut medal.owners, sender, true);
        let personal_medal = PersonalMedal {
            id: object::new(ctx),
            medal: object::uid_to_inner(&medal.id),
            name: medal.name,
            description: medal.description,
            image_url: medal.image_url,
        };
        transfer::transfer(personal_medal, sender);
    }

    #[test]
    fun test_medal() {
        let admin = @0xFACE;
        let publisher = @0xCAFE;
        let user = @0xBABE;

        let scenario_val = test_scenario::begin(admin);
        let scenario = &mut scenario_val;
        test_scenario::next_tx(scenario, admin);
        {
            create_medal_store(test_scenario::ctx(scenario));
        };
        test_scenario::next_tx(scenario, publisher);
        {
            let medal_store = test_scenario::take_shared<MedalStore>(scenario);
            assert!(table::is_empty(&medal_store.medals), 0);

            create_medal(
                &mut medal_store,
                b"medal name",
                b"medal description",
                100,
                vector::empty<address>(),
                b"logo",
                test_scenario::ctx(scenario),
            );

            assert!(table::length(&medal_store.medals) == 1, 0);
            test_scenario::return_shared(medal_store);
        };
        test_scenario::next_tx(scenario, user);
        {
            let medal = test_scenario::take_shared<Medal>(scenario);
            assert!(table::length(&medal.owners) == 0, 0);

            claim_medal(&mut medal, test_scenario::ctx(scenario));

            assert!(table::length(&medal.owners) == 1, 0);
            assert!(table::contains(&medal.owners, user), 0);
            test_scenario::return_shared(medal);
        };
        test_scenario::next_tx(scenario, user);
        {
            let medal_store = test_scenario::take_shared<MedalStore>(scenario);
            let medal = test_scenario::take_shared<Medal>(scenario);
            let personal_medal = test_scenario::take_from_sender<PersonalMedal>(scenario);
            assert!(personal_medal.medal == object::uid_to_inner(&medal.id), 0);
            test_scenario::return_shared(medal);
            test_scenario::return_shared(medal_store);
            test_scenario::return_to_sender(scenario, personal_medal);
        };
        test_scenario::end(scenario_val);
    }
}
