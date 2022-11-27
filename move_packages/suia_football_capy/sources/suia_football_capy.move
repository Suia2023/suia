module suia_football_capy::suia_football_capy {
    use sui::object::{UID, ID};
    use capy::capy::Capy;
    use sui::tx_context::TxContext;
    use sui::object;
    use sui::transfer;
    use sui::tx_context;
    use std::string::String;
    use mynft::suia::PersonalMedal;
    use sui::vec_map::VecMap;
    use sui::vec_map;

    const ENOT_ADMIN: u64 = 1;
    const EIINVALID_SUIA: u64 = 2;

    struct SuiaFootballCapy has key {
        id: UID,
        capy: Capy,
        name: String,
        description: String,
        url: String,
    }

    struct SuiaFootballCapyMeta has store {
        name: String,
        description: String,
        url: String,
    }

    struct MetaStore has key {
        id: UID,
        admin: address,
        capy_meta_mapping: VecMap<ID, SuiaFootballCapyMeta>,
    }

    fun init(ctx: &mut TxContext) {
        let sender = tx_context::sender(ctx);
        let meta_store = MetaStore {
            id: object::new(ctx),
            admin: sender,
            capy_meta_mapping: vec_map::empty(),
        };
        transfer::share_object(meta_store)
    }

    public entry fun add_meta(
        meta_store: &mut MetaStore,
        medal_id: ID,
        name: String,
        description: String,
        url: String,
        ctx: &mut TxContext,
    ) {
        assert!(tx_context::sender(ctx) == meta_store.admin, ENOT_ADMIN);
        let capy_meta = SuiaFootballCapyMeta {
            name,
            description,
            url,
        };
        vec_map::insert(&mut meta_store.capy_meta_mapping, medal_id, capy_meta);
    }

    public entry fun claim_football_suia_capy(
        meta_store: &MetaStore,
        capy: Capy,
        medal_id: ID,
        _suia: &PersonalMedal,
        ctx: &mut TxContext,
    ) {
        // TODO: check medal_id and suia match after suia implements get_id of PersonalMedal
        assert!(vec_map::contains(&meta_store.capy_meta_mapping, &medal_id), EIINVALID_SUIA);
        // TODO: call `capy::add_item` after it becomes public
        let meta = vec_map::get(&meta_store.capy_meta_mapping, &medal_id);
        let foolball_suia_capy = SuiaFootballCapy {
            id: object::new(ctx),
            capy,
            name: meta.name,
            description: meta.description,
            url: meta.url,
        };
        let sender = tx_context::sender(ctx);
        transfer::transfer(foolball_suia_capy, sender);
    }
}
