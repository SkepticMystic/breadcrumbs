import { z } from "zod";
import { quote_join } from "./strings";

export type Literal = string | number | boolean;

function not_string_msg(field: string, received: unknown) {
	return `Expected a string (text), but got: \`${received}\` (${typeof received}). _Try wrapping the value in quotes._
**Example**: \`${field}: "${received}"\``;
}

function invalid_enum_msg(
	field: string,
	options: Literal[] | readonly Literal[],
	received: unknown,
) {
	return `Expected one of the following options: ${quote_join(options, "`", ", or ")}, but got: \`${received}\`.
**Example**: \`${field}: ${options[0]}\``;
}

function not_array_msg(
	field: string,
	options: Literal[] | readonly Literal[],
	received: unknown,
) {
	return `This field is now expected to be a YAML list (array), but got: \`${received}\` (${typeof received}). _Try wrapping it in square brackets._
**Example**: \`${field}: [${options.slice(0, 2).join(", ")}]\`, or possibly: \`${field}: [${received}]\``;
}

function dynamic_enum_schema(
	options: string[],
	/** Optionally override ctx.path (useful in the sort.order/sort.field case) */
	field?: string,
) {
	return z.string().superRefine((received, ctx) => {
		if (options.includes(received)) {
			return true;
		} else {
			ctx.addIssue({
				options,
				received: received,
				code: "invalid_enum_value",
				// NOTE: Leave the default path on _this_ object, but pass the override into the error message
				message: invalid_enum_msg(
					field ?? ctx.path.join("."),
					options,
					received,
				),
			});

			return false;
		}
	});
}

function dynamic_enum_array_schema(
	field: string,
	options: string[],
	received: unknown,
) {
	return z.array(dynamic_enum_schema(options), {
		invalid_type_error: not_array_msg(field, options, received),
	});
}

export const zod = {
	error: {
		not_string: not_string_msg,
		invalid_enum: invalid_enum_msg,
		not_array: not_array_msg,
	},

	schema: {
		dynamic_enum: dynamic_enum_schema,
		dynamic_enum_array: dynamic_enum_array_schema,
	},
};
