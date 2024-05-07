import { Setting } from "obsidian";

export const new_setting = <
	SO extends string,
	CL extends Partial<Record<string, boolean>>,
>(
	container_el: HTMLElement,
	config: Partial<{
		name: string;
		desc: string | DocumentFragment;
		toggle: {
			value: boolean;
			cb: (toggle: boolean) => void;
		};
		input: {
			value: string;
			placeholder?: string;
			cb: (value: string) => void;
		};
		select: {
			options: SO[] | readonly SO[] | Record<string, SO>;
			value: SO;
			cb: (value: SO) => void;
		};
		checklist: {
			options: CL;
			cb: (value: CL) => void;
		};
	}>,
) => {
	const setting = new Setting(container_el);

	if (config.name) setting.setName(config.name);
	if (config.desc) setting.setDesc(config.desc);

	if (config.toggle) {
		setting.addToggle((toggle) => {
			toggle.setValue(config.toggle!.value).onChange(config.toggle!.cb);
		});
	} else if (config.input) {
		setting.addText((text) => {
			if (config.input?.placeholder) {
				text.setPlaceholder(config.input!.placeholder);
			}

			text.setValue(config.input!.value);

			text.inputEl.onblur = () => {
				config.input!.cb(text.getValue());
			};
		});
	} else if (config.select) {
		setting.addDropdown((dropdown) => {
			const options = Array.isArray(config.select!.options)
				? config.select!.options.reduce(
						(acc, option) => {
							acc[option] = option;
							return acc;
						},
						{} as Record<string, SO>,
					)
				: (config.select!.options as Record<string, SO>);

			dropdown
				.addOptions(options)
				.setValue(config.select!.value)
				.onChange(config.select!.cb as any);
		});
	} else if (config.checklist) {
		const checklist_el = setting.controlEl.createEl("div", {
			attr: { class: "flex flex-wrap gap-3" },
		});

		let state = { ...config.checklist.options };

		Object.keys(config.checklist.options).forEach((key) => {
			const attr: DomElementInfo["attr"] = { type: "checkbox" };
			// NOTE: Only add the property if checked: true
			//   (HTML doesn't seem to care what the value is, just that it's present)
			if (config.checklist!.options[key]!) attr.checked = true;

			checklist_el
				.createEl("label", {
					text: key,
					cls: "flex items-center gap-1.5 grow",
				})
				.createEl("input", { attr }, (el) => {
					el.classList.add("shrink");

					el.onchange = (e) => {
						if (!(e.target instanceof HTMLInputElement)) return;

						state[key as keyof CL] = e.target.checked as any;

						config.checklist!.cb(state);
					};
				});
		});
	}

	return setting;
};
