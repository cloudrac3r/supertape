import {OperatorStub} from '@supertape/operator-stub';

import {
    stub,
    Stub,
} from '@cloudcmd/stub';

type Result = {
    is: boolean,
    expected: unknown,
    actual: unknown,
    message: string,
    output: string,
};

type Test = OperatorStub & {
    equal: (result: unknown, expected: unknown, message?: string) => Result;
    notEqual: (result: unknown, expected: unknown, message?: string) => Result;
    deepEqual: (result: unknown, expected: unknown, message?: string) => Result;
    notDeepEqual: (result: unknown, expected: unknown, message?: string) => Result;
    fail: (message: string) => Result;
    pass: (message: string) => Result;
    ok: (result: boolean | unknown, message?: string) => Result;
    comment: (message: string) => Result;
    notOk: (result: boolean | unknown, message?: string) => Result;
    match: (result: string, pattern: string | RegExp, message?: string) => Result;
    notMatch: (result: string, pattern: string | RegExp, message?: string) => Result;
    end: () => void;
};

type TestOptions = {
    checkAssertionsCount?: boolean,
    checkScopes?: boolean,
    checkDuplicates?: boolean,
};

declare function test(message: string, fn: (t: Test) => void, options?: TestOptions): void;
declare namespace test {
    export var only: typeof test;
    export var skip: typeof test;
}

export default test;

type CustomOperators = {
    [index: string]: (operator: Test) => (...args: any[]) => Result
};

declare function extend(operators: CustomOperators): Test;

export {
    test,
    Test,
    stub,
    Stub,
    extend,
};

