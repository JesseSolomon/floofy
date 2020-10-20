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
/** A context for floofy selectors */
declare type Floofle = {
    [selector: string]: Floofy;
};
interface String {
    /** Convert this string into a floofy selector */
    readonly floofy: Floofy;
}
interface HTMLElement {
    /** Returns this elements floofy context */
    readonly floofle: Floofle;
}
declare const floofy: (selector: string, context?: ParentNode) => Floofy;
