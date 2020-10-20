const floofy = (selector, context = document) => {
    let floof = {};
    const realize_selector = (prefers_existing) => {
        let working_selector = selector.replace(/\s*>\s*/g, ">").replace(/\s\s+/g, " ");
        let parent = context;
        let el = null;
        const parse_element = (selector) => {
            let el = null;
            selector = selector.replace(/^[\w-_]+/, tag => {
                el = document.createElement(tag);
                return "";
            });
            if (!el)
                el = document.createElement("div");
            selector = selector.replace(/\[[\w\-_]*(\s*=\s*)?([\w\-_]+|"((?!").)*"|'((?!').*)')\]/g, attr => {
                let [name, value] = attr.replace(/(^\[|\]$)/g, "").split("=").map(seg => seg.trim());
                if (value) {
                    value = value.replace(/(^"|"$)/g, "").replace(/(^'|'$)/g, "");
                }
                el.setAttribute(name, value || "");
                return "";
            });
            selector = selector.replace(/(?<=#)[\w-_]+/g, id => {
                el.id = id;
                return "";
            });
            selector = selector.replace(/(?<=.)[\w-_]+/g, cls => {
                el.classList.add(cls);
                return "";
            });
            return el;
        };
        if (prefers_existing) {
            el = parent.querySelector(working_selector);
        }
        while ((el === null || !prefers_existing) && working_selector) {
            let breakpoint = Math.min(...[working_selector.indexOf(">"), working_selector.indexOf(" "), working_selector.length].filter(i => i > -1));
            let current = working_selector.slice(0, breakpoint).trim();
            working_selector = working_selector.slice(breakpoint + 1).trim();
            let next = parent.querySelector(current);
            if ((!prefers_existing && working_selector) && next) {
                parent = next;
            }
            else {
                let new_element = parse_element(current);
                parent.appendChild(new_element);
                parent = new_element;
                if (working_selector && prefers_existing) {
                    el = parent.querySelector(working_selector);
                }
                else {
                    el = new_element;
                }
            }
        }
        return el;
    };
    Object.defineProperty(floof, "actual", {
        get: () => realize_selector(true)
    });
    Object.defineProperty(floof, "new", {
        get: () => realize_selector(false)
    });
    Object.defineProperty(floof, "for", {
        get: () => (() => undefined),
        set: (constructor) => {
            let observer = new MutationObserver(mutations => {
                for (let mutation of mutations) {
                    mutation.addedNodes.forEach(node => {
                        if (node instanceof HTMLElement && node.matches(selector)) {
                            constructor(node);
                        }
                    });
                }
            });
            observer.observe(context, {
                childList: true,
                subtree: true
            });
            if (typeof constructor === "function") {
                context.querySelectorAll(selector).forEach(element => {
                    if (element instanceof HTMLElement) {
                        constructor(element);
                    }
                });
            }
            else {
                throw new TypeError(`constructor must be of type function, received ${typeof constructor}`);
            }
        }
    });
    Object.defineProperty(floof, "all", {
        get: () => context.querySelectorAll(selector)
    });
    Object.defineProperty(floof, "first", {
        get: () => context.querySelector(selector)
    });
    return floof;
};
Object.defineProperty(String.prototype, "floofy", {
    get() {
        return floofy(this);
    }
});
Object.defineProperty(HTMLElement.prototype, "floofle", {
    get: function () {
        return new Proxy(this, {
            get: (el, selector) => {
                if (typeof selector === "string") {
                    return floofy(selector, el);
                }
                else {
                    throw new TypeError("selector must be of type string");
                }
            }
        });
    }
});
//# sourceMappingURL=floofy.js.map