module suia::test_nft {
    use sui::object::UID;
    use sui::tx_context::{TxContext, sender};
    use sui::object;
    use sui::transfer;
    use sui::tx_context;
    use std::string::{String, utf8};
    use sui::package;
    use sui::display;

    struct TEST_NFT has drop {}

    struct SuiaTestNFT has key, store {
        id: UID,
        name: String,
        description: String,
        image_url: String,
        creator: address,
    }

    fun init(otw: TEST_NFT, ctx: &mut TxContext) {
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
            utf8(b"https://suia.io"),
            utf8(b"{image_url}"),
            utf8(b"{description}"),
            utf8(b"https://suia.io/"),
            utf8(b"{creator}"),
        ];
        let medal_display = display::new_with_fields<SuiaTestNFT>(
            &publisher, medal_keys, medal_values, ctx
        );
        display::update_version(&mut medal_display);
        transfer::public_transfer(medal_display, sender(ctx));
        transfer::public_transfer(publisher, sender(ctx));
    }

    public entry fun claim(
        name: vector<u8>,
        description: vector<u8>,
        image_url: vector<u8>,
        ctx: &mut TxContext,
    ) {
        let nft = SuiaTestNFT {
            id: object::new(ctx),
            name: utf8(name),
            description: utf8(description),
            image_url: utf8(image_url),
            creator: tx_context::sender(ctx),
        };
        transfer::transfer(nft, tx_context::sender(ctx));
    }
}
