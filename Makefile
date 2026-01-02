local_build:
		bun install -g wasm-pack
		cd wasm
		rustup override set nightly
		rustup component add rust-src --toolchain nightly-x86_64-unknown-linux-gnu
		cd ..
		bun install
		bun run wasm:build || exit 1
		bun run build || exit 1
		npm i
		npm run dev

local_test:
		bun install -g wasm-pack
		cd wasm
		rustup override set nightly
		rustup component add rust-src --toolchain nightly-x86_64-unknown-linux-gnu
		cd ..
		bun install
		bun run wasm:build || exit 1
		bun run build || exit 1
		bun run test || exit 1
		npm i
		npm run dev
