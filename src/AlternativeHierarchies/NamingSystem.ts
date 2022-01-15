import type { MultiGraph } from "graphology";
import type BCPlugin from "../main";
import { getSourceOrder, getTargetOrder, populateMain } from "../graphUtils";
import type { dvFrontmatterCache } from "../interfaces";
import { getDVBasename, getFields, strToRegex } from "../sharedFunctions";

export function addNamingSystemNotesToGraph(
  plugin: BCPlugin,
  frontms: dvFrontmatterCache[],
  mainG: MultiGraph
) {
  const { settings } = plugin;
  const {
    namingSystemRegex,
    namingSystemSplit,
    namingSystemField,
    namingSystemEndsWithDelimiter,
    userHiers,
  } = settings;
  const regex = strToRegex(namingSystemRegex);
  if (!regex) return;

  const field = namingSystemField || getFields(userHiers)[0];

  // const visited: string[] = [];
  // const deepestMatches = frontms.filter((page) => {
  //   const basename = getDVBasename(page.file);
  //   return regex.test(basename);
  // });

  function trimRegex(regex: RegExp, split: string) {
    const { source } = regex;
    const parts = source.split(split);
    const sliced = parts
      .slice(0, -1)
      .map((p) => (p.endsWith("\\") ? p.slice(0, -1) : p));

    let joined = sliced.join("\\" + split);
    joined = joined.startsWith("^") ? joined : "^" + joined;
    // joined =
    //   joined +
    //   (namingSystemEndsWithDelimiter ? "\\" + namingSystemSplit : "");

    return sliced.length ? new RegExp(joined) : null;
  }

  function getUp(current: string) {
    let currReg = trimRegex(regex, namingSystemSplit);
    let up = current.match(currReg);
    while (currReg || !up || up[0] === current) {
      currReg = trimRegex(currReg, namingSystemSplit);
      if (!currReg) break;
      up = current.match(currReg);
    }
    console.log({ currReg });
    return up?.[0] ?? null;
  }

  frontms.forEach((page) => {
    const sourceBN = getDVBasename(page.file);
    const upSystem = getUp(sourceBN);
    console.log(sourceBN, "↑", upSystem);
    if (!upSystem) return;

    const upFm = frontms.find((fm) => {
      const upBN = getDVBasename(fm.file);
      const start =
        upSystem + (namingSystemEndsWithDelimiter ? namingSystemSplit : "");
      return (
        upBN !== sourceBN && (upBN === start || upBN.startsWith(start + " "))
      );
    });

    if (!upFm) return;
    const upBN = getDVBasename(upFm.file);

    if (upBN === sourceBN) return;

    const sourceOrder = getSourceOrder(page);
    const targetOrder = getTargetOrder(frontms, upBN);
    populateMain(
      settings,
      mainG,
      sourceBN,
      field,
      upBN,
      sourceOrder,
      targetOrder,
      true
    );
  });

  // deepestMatches.forEach((deepest) => {
  //   console.log(deepest.file.name);
  //   const basename = getDVBasename(deepest.file);
  //   const allSplits: string[] = [];
  //   let nextSplit = splitName(basename, namingSystemSplit);
  //   while (nextSplit) {
  //     allSplits.push(nextSplit);
  //     nextSplit = splitName(nextSplit, namingSystemSplit);
  //   }
  //   console.log({ allSplits });

  //   let current: dvFrontmatterCache = deepest;
  //   for (const split of allSplits) {
  //     const up = frontms.find((page) => {
  //       const basename = getDVBasename(page.file);
  //       return (
  //         !visited.includes(basename) &&
  //         // For the final split, the naming system part likely won't have any delimiters in it. This means that alot more false positives will match
  //         // e.g. if system is `\d\.\d\.`, and the final split is `1`, then something like `1 of my favourites snacks` might match before `1 Index`.
  //         // The setting `namingSystemEndsWithDelimiter` tries to account for this
  //         basename.startsWith(
  //           split + (namingSystemEndsWithDelimiter ? namingSystemSplit : "")
  //         )
  //       );
  //     });
  //     if (!up) continue;
  //     const upName = getDVBasename(up.file);
  //     visited.push(upName);
  //     console.log("up:", upName);

  //     const sourceOrder = getSourceOrder(current);
  //     const targetOrder = getTargetOrder(frontms, upName);
  //     populateMain(
  //       mainG,
  //       getDVBasename(current.file),
  //       field,
  //       upName,
  //       sourceOrder,
  //       targetOrder,
  //       true
  //     );

  //     current = up;
  //   }
  // });
}
