interface Floofy {
    /** Executes the given function on all current and future elements that match the selector */
    for: (el: HTMLElement) => void;
    /** Returns the requested element, if it doesn't exist, it will be created to best match the selector */
    actual: HTMLElement;
    /** Creates as few elements as possible to best matching the selector, unlike `actual`, this will create at least one element regardless of whether it already exists */
    new: HTMLElement;
    /** Returns all elements which match the selector, same as _querySelectorAll_ */
    all: NodeList;
    /** Returns the first element which matches the selector, same as _querySelector_ */
    first?: HTMLElement;
}
/** Handlers for url-based page selection */
declare type Page<T = any> = (data: T) => void | (() => void);
/** A context for floofy selectors */
declare type Floofle = {
    [selector: string]: Floofy;
};
interface String {
    readonly f: Floofy;
}
interface HTMLElement {
    readonly f: Floofle;
}
interface Location {
    readonly f: Page;
}
declare function floofy(selector: string, context?: ParentNode): Floofy;
declare namespace floofy {
    const element_register: {
        [selector: string]: {
            signature: symbol;
            constructor: (el: HTMLElement) => void;
        };
    };
    const match_element: (el: HTMLElement) => void;
}
