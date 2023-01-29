module mynft::suia_capy {
    use sui::object::UID;
    use sui::url::{Self, Url};
    use capy::capy::Capy;
    use sui::tx_context::TxContext;
    use sui::object;
    use sui::transfer;
    use sui::tx_context;
    use std::string::{String, utf8};
    use std::vector;
    use std::string;

    const ENOT_ADMIN: u64 = 1;
    const EIINVALID_SUIA: u64 = 2;

    const IMAGE_URL: vector<u8> = b"https://suia.io/api/capy/";

    struct SuiaCapyItem has key, store {
        id: UID,
        url: Url,
        type: String,
        name: String,
    }

    struct SuiaCapy has key, store {
        id: UID,
        capy: Capy,
        name: String,
        description: String,
        url: Url,
        items: vector<SuiaCapyItem>
    }

    struct SuiaCapyManagerCap has key, store {
        id: UID,
    }

    fun init(ctx: &mut TxContext) {
        let sender = tx_context::sender(ctx);
        let cap = SuiaCapyManagerCap {
            id: object::new(ctx),
        };
        transfer::transfer(cap, sender);
    }

    public fun create_item(
        _: &SuiaCapyManagerCap,
        type: vector<u8>,
        name: vector<u8>,
        ctx: &mut TxContext
    ): SuiaCapyItem {
        let id = object::new(ctx);

        SuiaCapyItem {
            url: img_url(&id),
            id,
            type: string::utf8(type),
            name: string::utf8(name)
        }
    }

    public entry fun create_and_send_item(
        cap: &SuiaCapyManagerCap,
        type: vector<u8>,
        name: vector<u8>,
        recipient: address,
        ctx: &mut TxContext
    ) {
        sui::transfer::transfer(
            create_item(cap, type, name, ctx),
            recipient,
        );
    }

    public entry fun batch_create_and_send_item(
        cap: &SuiaCapyManagerCap,
        type: vector<u8>,
        name: vector<u8>,
        recipient: vector<address>,
        ctx: &mut TxContext
    ) {
        while (!vector::is_empty(&recipient)) {
            sui::transfer::transfer(
                create_item(cap, type, name, ctx),
                vector::pop_back(&mut recipient),
            );
        }
    }

    public entry fun wrap_capy_with_item(
        capy: Capy,
        item: SuiaCapyItem,
        name: vector<u8>,
        description: vector<u8>,
        ctx: &mut TxContext
    ) {
        let id = object::new(ctx);
        let suia_capy = SuiaCapy {
            url: img_url(&id),
            id,
            capy,
            name: utf8(name),
            description: utf8(description),
            items: vector::singleton(item),
        };
        transfer::transfer(suia_capy, tx_context::sender(ctx));
    }

    public entry fun wrap_suia_capy_with_item(
        suia_capy: &mut SuiaCapy,
        item: SuiaCapyItem,
        name: vector<u8>,
        description: vector<u8>,
        _ctx: &mut TxContext,
    ) {
        suia_capy.name = utf8(name);
        suia_capy.description = utf8(description);
        vector::push_back(&mut suia_capy.items, item)
    }

    fun img_url(c: &UID): Url {
        let capy_url = *&IMAGE_URL;
        vector::append(&mut capy_url, sui::hex::encode(object::uid_to_bytes(c)));
        vector::append(&mut capy_url, b"/svg");

        url::new_unsafe_from_bytes(capy_url)
    }
}
