module mynft::suia {
    use sui::object::{Self, ID, UID};
    use sui::tx_context::{Self, TxContext};
    use std::string::{String, utf8};
    use sui::vec_set::{Self, VecSet};
    use sui::transfer;
    use std::vector;
    #[test_only]
    use sui::test_scenario;

    // errors
    const ESENDER_NOT_AUTHORIZED_TO_CLAIM: u64 = 0;
    const EMEDAL_MAX_AMOUNT_REACHED: u64 = 1;
    const EALREADY_CLAIMED: u64 = 2;

    struct MedalStore has key {
        id: UID,
        medals: vector<ID>
    }

    struct Medal has key {
        id: UID,
        name: String,
        description: String,
        logo: String,
        max_amount: u64,
        whitelist: VecSet<address>,
        owners: VecSet<address>,
    }

    struct PersonalMedal has key {
        id: UID,
        medal: ID,
    }

   fun init(ctx: &mut TxContext) {
       create_medal_store(ctx)
    }

    fun create_medal_store(
        ctx: &mut TxContext,
    ) {
        let store = MedalStore {
            id: object::new(ctx),
            medals: vector::empty<ID>()
        };
        transfer::share_object(store)
    }

    public entry fun create_medal(
        medal_store: &mut MedalStore,
        name: vector<u8>,
        description: vector<u8>,
        max_amount: u64,
        whitelist: vector<address>,
        logo: vector<u8>,
        ctx: &mut TxContext,
    )  {
        let medal = Medal {
            id: object::new(ctx),
            name: utf8(name),
            description: utf8(description),
            logo: utf8(logo),
            max_amount,
            whitelist: vec_set::empty(),
            owners: vec_set::empty(),
        };
        let len = vector::length(&whitelist);
        let i = 0;
        while (i < len) {
            vec_set::insert(&mut medal.whitelist, *vector::borrow(&whitelist, i));
            i = i + 1;
        };
        vector::push_back(&mut medal_store.medals, object::uid_to_inner(&medal.id));
        transfer::share_object(medal);
    }

    public entry fun claim_medal(
        medal: &mut Medal,
        ctx: &mut TxContext,
    ) {
        let sender = tx_context::sender(ctx);
        assert!(vec_set::is_empty(&medal.whitelist) || vec_set::contains(&medal.whitelist, &sender), ESENDER_NOT_AUTHORIZED_TO_CLAIM);
        assert!(vec_set::size(&medal.owners) < medal.max_amount, EMEDAL_MAX_AMOUNT_REACHED);
        assert!(!vec_set::contains(&medal.owners, &sender), EALREADY_CLAIMED);
        vec_set::insert(&mut medal.owners, sender);
        let personal_medal = PersonalMedal {
            id: object::new(ctx),
            medal: object::uid_to_inner(&medal.id),
        };
        transfer::transfer(personal_medal, sender);
    }

    #[test]
    fun test_medal() {
        let admin = @0xFACE;
        let publisher = @0xCAFE;
        let user = @0xBABE;

        let scenario = &mut test_scenario::begin(&admin);
        test_scenario::next_tx(scenario, &admin);
        {
            create_medal_store(test_scenario::ctx(scenario));
        };
        test_scenario::next_tx(scenario, &publisher);
        {
            let medal_store_wrapper = test_scenario::take_shared<MedalStore>(scenario);
            let medal_store = test_scenario::borrow_mut(&mut medal_store_wrapper);
            assert!(vector::is_empty(&medal_store.medals), 0);

            create_medal(
                medal_store,
                b"sui con",
                b"sui con 2022",
                100,
                vector::empty<address>(),
                b"logo",
                test_scenario::ctx(scenario),
            );

            assert!(vector::length(&medal_store.medals) == 1, 0);
            test_scenario::return_shared(scenario, medal_store_wrapper);
        };
        test_scenario::next_tx(scenario, &user);
        {
            let medal_wrapper = test_scenario::take_shared<Medal>(scenario);
            let medal = test_scenario::borrow_mut(&mut medal_wrapper);
            assert!(vec_set::size(&medal.owners) == 0, 0);

            claim_medal(medal, test_scenario::ctx(scenario));

            assert!(vec_set::size(&medal.owners) == 1, 0);
            assert!(vec_set::contains(&medal.owners, &user), 0);
            test_scenario::return_shared(scenario, medal_wrapper);
        };
        test_scenario::next_tx(scenario, &user);
        {
            let medal_wrapper = test_scenario::take_shared<Medal>(scenario);
            let medal = test_scenario::borrow_mut(&mut medal_wrapper);
            let personal_medal = test_scenario::take_owned<PersonalMedal>(scenario);
            assert!(personal_medal.medal == object::uid_to_inner(&medal.id), 0);
            test_scenario::return_shared(scenario, medal_wrapper);
            test_scenario::return_owned(scenario, personal_medal);
        }
    }
}
