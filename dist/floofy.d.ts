interface Floofy {
    /** Executes the given function on all current and future elements that match the selector */
    for: (element: HTMLElement) => void;
    /** Returns the requested element, if it doesn't exist, it will be created to best match the selector */
    actual: HTMLElement;
    /** Creates as few elements as possible to best matching the selector, unlike `actual`, this will create at least one element regardless of whether it already exists */
    new: HTMLElement;
    /** Returns all elements which match the selector, same as _querySelectorAll_ but will only return _HTMLElement_ s */
    all: HTMLElement[];
    /** Returns the first element which matches the selector, same as _querySelector_ */
    first?: HTMLElement;
}
interface String {
    readonly f: Floofy;
}
interface Location {
    readonly f: {
        [url: string]: (state?: any, title?: string) => void;
    };
}
interface Node {
    readonly f: {
        [selector: string]: Floofy;
    };
    [floofy.mutation_observer]?: MutationObserver;
    [floofy.element_register]?: {
        [selector: string]: {
            signature: symbol;
            constructor: (el: HTMLElement) => void;
        };
    };
}
interface MutationObserver {
    [floofy.mutation_update]?: (elements: HTMLElement[]) => boolean[];
}
declare function floofy(node: Node, selector: string): Floofy;
declare namespace floofy {
    const element_register: unique symbol;
    const mutation_observer: unique symbol;
    const mutation_update: unique symbol;
    const page_register: {
        [regex: string]: {
            capture_groups: string[];
            handler: (state: object) => void;
        };
    };
}
