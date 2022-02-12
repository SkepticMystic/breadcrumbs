import { ARROW_DIRECTIONS, DIRECTIONS } from "../constants";
import type { Directions, UserHier } from "../interfaces";

/**
 * Get all the fields in `dir`.
 * Returns all fields if `dir === 'all'`
 * @param  {UserHier[]} userHiers
 * @param  {Directions|"all"} dir
 */
export function getFields(
  userHiers: UserHier[],
  dir: Directions | "all" = "all"
) {
  const fields: string[] = [];
  userHiers.forEach((hier) => {
    if (dir === "all") {
      DIRECTIONS.forEach((eachDir) => {
        fields.push(...hier[eachDir]);
      });
    } else {
      fields.push(...hier[dir]);
    }
  });
  return fields;
}

export const getOppDir = (dir: Directions): Directions => {
  switch (dir) {
    case "up":
      return "down";
    case "down":
      return "up";
    case "same":
      return "same";
    case "next":
      return "prev";
    case "prev":
      return "next";
  }
};

/**
 *  Get the hierarchy and direction that `field` is in
 * */
export function getFieldInfo(userHiers: UserHier[], field: string) {
  let fieldDir: Directions;
  let fieldHier: UserHier;

  DIRECTIONS.forEach((dir: Directions) => {
    userHiers.forEach((hier) => {
      if (hier[dir].includes(field)) {
        fieldDir = dir;
        fieldHier = hier;
        return;
      }
    });
  });
  return { fieldHier, fieldDir };
}

export function getOppFields(
  userHiers: UserHier[],
  field: string,
  dir: Directions
) {
  // If the field ends with `>`, it is already the opposite field we need (coming from `getOppFallback`)
  if (field.endsWith(">")) return [field.slice(0, -4)];

  const oppFields = [fallbackOppField(field, dir)];
  const { fieldHier, fieldDir } = getFieldInfo(userHiers, field);
  if (!fieldHier || !fieldDir) return oppFields;

  const oppDir = getOppDir(fieldDir);
  oppFields.unshift(...fieldHier[oppDir]);
  return oppFields;
}

export const hierToStr = (hier: UserHier) =>
  DIRECTIONS.map(
    (dir) => `${ARROW_DIRECTIONS[dir]}: ${hier[dir].join(", ")}`
  ).join("\n");

export const fallbackField = (field: string, dir: Directions) =>
  `${field} <${ARROW_DIRECTIONS[dir]}>`;
export const fallbackOppField = (field: string, dir: Directions) =>
  `${field} <${ARROW_DIRECTIONS[getOppDir(dir)]}>`;

export function iterateHiers(
  userHiers: UserHier[],
  fn: (hier: UserHier, dir: Directions, field: string) => void
) {
  userHiers.forEach((hier) => {
    DIRECTIONS.forEach((dir) => {
      hier[dir].forEach((field) => {
        fn(hier, dir, field);
      });
    });
  });
}
