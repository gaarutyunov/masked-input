import {
    EOLState,
    FixedState,
    FreeState,
    Notation,
    OptionalValueState,
    State,
    ValueState
} from '../model';
import {FormatSanitizer} from './format-sanitizer';

export class Compiler {

    constructor(
        private customNotations: ReadonlyArray<Notation>
    ) {
    }

    public compile(formatString: string): State | never {
        try {
            const sanitizedString: string = FormatSanitizer.sanitize(formatString);

            return this._compile(
                sanitizedString,
                false,
                false,
                null
            );
        } catch (e) {
            throw new Error('Wrong format');
        }
    }

    private _compile(
        formatString: string,
        valuable: boolean,
        fixed: boolean,
        lastCharacter: string | null
    ): State {
        if (formatString.isEmpty()) {
            return new EOLState();
        }

        const char: string = formatString.first();

        switch (char) {
            case '[': {
                if (lastCharacter !== '\\') {
                    return this._compile(
                        formatString.substring(1),
                        true,
                        false,
                        char
                    );
                }
                break;
            }
            case '{': {
                if (lastCharacter !== '\\') {
                    return this._compile(
                        formatString.substring(1),
                        false,
                        true,
                        char
                    );
                }
                break;
            }
            case ']': {
                if (lastCharacter !== '\\') {
                    return this._compile(
                        formatString.substring(1),
                        false,
                        false,
                        char
                    );
                }
                break;
            }
            case '}': {
                if (lastCharacter !== '\\') {
                    return this._compile(
                        formatString.substring(1),
                        false,
                        false,
                        char
                    );
                }
                break;
            }
            case '\\': {
                if (lastCharacter !== '\\') {
                    return this._compile(
                        formatString.substring(1),
                        valuable,
                        fixed,
                        char
                    );
                }
                break;
            }
        }

        if (valuable) {
            switch (char) {
                case '0': {
                    return new ValueState(
                        this._compile(
                            formatString.substring(1),
                            true,
                            false,
                            char
                        ),
                        new ValueState.Numeric()
                    );
                }
                case 'A': {
                    return new ValueState(
                        this._compile(
                            formatString.substring(1),
                            true,
                            false,
                            char
                        ),
                        new ValueState.Literal()
                    );
                }
                case '_': {
                    return new ValueState(
                        this._compile(
                            formatString.substring(1),
                            true,
                            false,
                            char
                        ),
                        new ValueState.AlphaNumeric()
                    );
                }
                case '...': {
                    return new ValueState(null, this.determineInheritedType(lastCharacter));
                }
                case '9': {
                    return new OptionalValueState(
                        this._compile(
                            formatString.substring(1),
                            true,
                            false,
                            char
                        ),
                        new OptionalValueState.Numeric()
                    );
                }
                case 'a': {
                    return new OptionalValueState(
                        this._compile(
                            formatString.substring(1),
                            true,
                            false,
                            char
                        ),
                        new OptionalValueState.Literal()
                    );
                }
                case '-': {
                    return new OptionalValueState(
                        this._compile(
                            formatString.substring(1),
                            true,
                            false,
                            char
                        ),
                        new OptionalValueState.AlphaNumeric()
                    );
                }
                default: {
                    return this.compileWithCustomNotations(char, formatString);
                }
            }
        }

        if (fixed) {
            return new FixedState(
                this._compile(
                    formatString.substring(1),
                    false,
                    true,
                    char
                ),
                char
            );
        }

        return new FreeState(
            this._compile(
                formatString.substring(1),
                false,
                false,
                char
            ),
            char
        );
    }

    private determineInheritedType(lastCharacter: string | null): ValueState.StateType {
        switch (lastCharacter) {
            case '0' || '9': {
                return new ValueState.Numeric();
            }
            case 'A' || 'a': {
                return new ValueState.Literal();
            }
            case '_' || '_': {
                return new ValueState.AlphaNumeric();
            }
            case '...': {
                return new ValueState.AlphaNumeric();
            }
            case '[': {
                return new ValueState.AlphaNumeric();
            }
            default: {
                return this.determineTypeWithCustomNotation(lastCharacter);
            }
        }
    }

    private compileWithCustomNotations(char: string, str: string): State | never {
        const notation = this.customNotations.find(x => x.character === char);

        if (!notation) throw new Error('Wrong format')

        if (notation.isOptional) {
            return new OptionalValueState(
                this._compile(
                    str.substring(1),
                    true,
                    false,
                    char
                ),
                new OptionalValueState.Custom(char, notation.characterSet)
            );
        } else {
            return new ValueState(
                this._compile(
                    str.substring(1),
                    true,
                    false,
                    char
                ),
                new ValueState.Custom(char, notation.characterSet)
            );
        }
    }

    private determineTypeWithCustomNotation(
        lastCharacter: string | null
    ): ValueState.StateType | never {
        for (const notation of this.customNotations) {
            if (notation.character === lastCharacter) {
                return new ValueState.Custom(lastCharacter, notation.characterSet);
            }
        }
        throw new Error('Wrong format');
    }
}
