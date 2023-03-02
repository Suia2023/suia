module mynft::showcase {
    use sui::bag::{Self, Bag};
    use sui::object::{Self, UID};
    use std::string::{String, utf8};
    use sui::vec_map::{Self, VecMap};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    #[test_only]
    use sui::test_scenario;

    // errors
    const ENOT_AUTHORIZED: u64 = 1;
    const ELAYOUT_EXISTS: u64 = 2;
    const ELAYOUT_NOT_EXISTS: u64 = 3;
    const ENFT_EXISTS_AT_THIS_POSITION: u64 = 4;
    const EINVALID_POSITION: u64 = 5;
    const ENFT_NOT_EXISTS_AT_THIS_POSITION: u64 = 6;

    struct Layout has store {
        name: String,
        max_nft_num: u64,
    }

    struct Config has key, store {
        id: UID,
        admin: address,
        layouts: VecMap<String, Layout>
    }

    struct Showcase has key, store {
        id: UID,
        name: String,
        layout: String,
        nfts: Bag,
    }

    fun init(ctx: &mut TxContext) {
        create_config(ctx)
    }

    fun create_config(
        ctx: &mut TxContext,
    ) {
        let config = Config {
            id: object::new(ctx),
            layouts: vec_map::empty(),
            admin: tx_context::sender(ctx),
        };
        transfer::share_object(config)
    }

    public entry fun add_layout(
        config: &mut Config,
        name: vector<u8>,
        max_nft_num: u64,
        ctx: &mut TxContext,
    ) {
        assert!(config.admin == tx_context::sender(ctx), ENOT_AUTHORIZED);
        let name = utf8(name);
        let layout = Layout {
            name,
            max_nft_num,
        };
        vec_map::insert(&mut config.layouts, name, layout);
    }

    public entry fun create_showcase(
        config: &Config,
        name: vector<u8>,
        layout: vector<u8>,
        ctx: &mut TxContext,
    ) {
        let name = utf8(name);
        let layout = utf8(layout);
        assert!(vec_map::contains(&config.layouts, &layout), ELAYOUT_NOT_EXISTS);
        let showcase = Showcase {
            id: object::new(ctx),
            layout,
            name,
            nfts: bag::new(ctx),
        };
        transfer::transfer(showcase, tx_context::sender(ctx));
    }

    public entry fun add_nft_to_showcase<NFT: key + store>(
        config: &Config,
        showcase: &mut Showcase,
        nft: NFT,
        position: u64,
        _ctx: &mut TxContext,
    ) {
        if (bag::contains(&showcase.nfts, position)) {
            abort ENFT_EXISTS_AT_THIS_POSITION
        };
        let layout_config = vec_map::get(&config.layouts, &showcase.layout);
        let max_nft_num = layout_config.max_nft_num;
        assert!(position < max_nft_num, EINVALID_POSITION);
        bag::add(&mut showcase.nfts, position, nft);
    }

    public entry fun extract_from_showcase<NFT: key + store>(
        showcase: &mut Showcase,
        position: u64,
        ctx: &mut TxContext,
    ) {
        assert!(bag::contains(&showcase.nfts, position), ENFT_NOT_EXISTS_AT_THIS_POSITION);
        let nft: NFT = bag::remove(&mut showcase.nfts, position);
        transfer::transfer(nft, tx_context::sender(ctx))
    }

    #[test_only]
    struct TestNFT1 has key, store {
        id: UID,
    }

    #[test_only]
    struct TestNFT2 has key, store {
        id: UID,
    }

    #[test_only]
    fun create_test_nft(
        ctx: &mut TxContext,
    ) {
        let test_nft1 = TestNFT1 {
            id: object::new(ctx),
        };
        let test_nft2 = TestNFT2 {
            id: object::new(ctx),
        };
        transfer::transfer(test_nft1, tx_context::sender(ctx));
        transfer::transfer(test_nft2, tx_context::sender(ctx));
    }

    #[test]
    fun test_showcase() {
        let admin = @0xFACE;
        let user = @0xBABE;

        let scenario_val = test_scenario::begin(admin);
        let scenario = &mut scenario_val;

        // create config
        create_config(test_scenario::ctx(scenario));
        test_scenario::next_tx(scenario, admin);
        let config = test_scenario::take_shared<Config>(scenario);
        assert!(vec_map::is_empty(&config.layouts), 0);
        assert!(config.admin == admin, 0);

        // add layout
        test_scenario::next_tx(scenario, admin);
        let layout_name = b"9-box grid";
        let max_nft_num = 9;
        add_layout(
            &mut config,
            layout_name,
            max_nft_num,
            test_scenario::ctx(scenario),
        );
        assert!(vec_map::size(&config.layouts) == 1, 0);

        // create showcase
        test_scenario::next_tx(scenario, user);
        let showcase_name = b"my sui space";
        create_showcase(
            &config,
            showcase_name,
            layout_name,
            test_scenario::ctx(scenario),
        );
        test_scenario::next_tx(scenario, user);
        let showcase = test_scenario::take_from_address<Showcase>(scenario, user);
        assert!(showcase.name == utf8(showcase_name), 0);
        assert!(showcase.layout == utf8(layout_name), 0);

        // add nft to showcase
        test_scenario::next_tx(scenario, user);
        create_test_nft(test_scenario::ctx(scenario));
        test_scenario::next_tx(scenario, user);
        let test_nft1 = test_scenario::take_from_address<TestNFT1>(scenario, user);
        let test_nft1_id = object::id(&test_nft1);
        let test_nft2 = test_scenario::take_from_address<TestNFT2>(scenario, user);
        let position = 8;
        add_nft_to_showcase(
            &config,
            &mut showcase,
            test_nft1,
            position,
            test_scenario::ctx(scenario),
        );

        // extract nft from showcase
        test_scenario::next_tx(scenario, user);
        extract_from_showcase<TestNFT1>(
            &mut showcase,
            position,
            test_scenario::ctx(scenario),
        );
        test_scenario::next_tx(scenario, user);
        let test_nft1_back = test_scenario::take_from_address<TestNFT1>(scenario, user);
        let test_nft1_back_id = object::id(&test_nft1_back);
        assert!(test_nft1_id == test_nft1_back_id, 0);

        // clean test
        test_scenario::return_shared(config);
        test_scenario::return_to_sender(scenario, showcase);
        test_scenario::return_to_sender(scenario, test_nft1_back);
        test_scenario::return_to_sender(scenario, test_nft2);
        test_scenario::end(scenario_val);
    }
}
