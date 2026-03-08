local_build:
		bun install -g wasm-pack
		cd wasm
		rustup override set stable
		rustup component add rust-src --toolchain stable-x86_64-unknown-linux-gnu
		cd ..
		bun install
		bun run wasm:build || exit 1
		bun run build || exit 1
		npm i
		npm run dev

local_test:
		bun install -g wasm-pack
		cd wasm
		rustup override set stable
		rustup component add rust-src --toolchain stable-x86_64-unknown-linux-gnu
		cd ..
		bun install
		bun run wasm:build || exit 1
		bun run build || exit 1
		bun run test || exit 1
		npm i
		npm run dev

build:
		bun install -g wasm-pack
		cd wasm
		rustup override set stable
		rustup component add rust-src --toolchain stable-x86_64-unknown-linux-gnu
		cd ..
		bun install
		bun run wasm:build || exit 1
		bun run build || exit 1
		npm i
