import type {ParsedCodeblock} from "../interfaces";
import type BCPlugin from "../main";
import {getPlugin, IJugglSettings} from 'juggl-api';
import {JUGGL_CB_DEFAULTS} from "../constants";

function indentToDepth(indent: string) {
    return indent.length / 2 + 1;
}

function meetsConditions(indent: string, node: string, froms: string[], min: number, max: number) {
    const depth = indentToDepth(indent);
    return (
        depth >= min &&
        depth <= max &&
        (froms === undefined || froms.includes(node))
    );
}

export function createdJugglCB(plugin: BCPlugin,
                               target: HTMLElement,
                               args: ParsedCodeblock,
                               lines: [string, string][],
                               froms: string[],
                               min: number,
                               max: number) {
    try {
        const jugglPlugin = getPlugin(plugin.app);
        if (!jugglPlugin) {
            // TODO: Error handling
            return;
        }
        for (let key in JUGGL_CB_DEFAULTS) {
            if (key in args && args[key] === undefined) {
                args[key] = JUGGL_CB_DEFAULTS[key];
            }
        }
        console.log({args});
        const nodes = lines
            .filter(([indent, node]) => meetsConditions(indent, node, froms, min, max))
            .map(([_, node]) => node);
        const juggl = jugglPlugin.createJuggl(target, args, null, nodes)
        plugin.addChild(juggl);
        juggl.load();
        console.log({juggl});
    }
    catch (error) {
        plugin.codeblockError(args)
    }
}