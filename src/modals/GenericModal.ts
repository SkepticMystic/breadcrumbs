import { App, Modal } from "obsidian";

export class GenericModal extends Modal {
	cb: (modal: GenericModal) => void;

	constructor(app: App, cb: (modal: GenericModal) => void) {
		super(app);

		this.cb = cb;
	}

	onOpen() {
		this.cb(this);
	}

	onClose() {
		this.contentEl.empty();
	}
}
