import type {ParsedCodeblock} from "../interfaces";
import type BCPlugin from "../main";
import {getPlugin, IJugglSettings} from 'juggl-api';

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
        const nodes = lines
            .filter(([indent, node]) => meetsConditions(indent, node, froms, min, max))
            .map(([_, node]) => node);
        console.log({nodes})
        const juggl = jugglPlugin.createJuggl(target, null, null, nodes)
        console.log("Created juggl!")
        plugin.addChild(juggl);
        juggl.load();
        console.log({juggl});
    }
    catch (error) {
        plugin.codeblockError(args)
    }
}