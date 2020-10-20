# Floofy

A tiny and cuddly framework for building simple or lightweight web apps!

## Features

- Less than 5kB
- Native Typescript comparability
- One page of super-intuitive documentation

## Example App

[Try it live!](https://codepen.io/SirPandaNugget/pen/ZEOprRG)

```html
<div id="counters"></div>
<button id="add-counter">Add Counter</button>
<script src="__/floofy.min.js"></script>
<script>
// Create a new counter when #add-counter is clicked
"#add-counter".floofy.first.onclick = () => "#counters [counter]".floofy.new;

// Logic for the counter element
"[counter]".floofy.for = el => {
	// Get a context for the current counter
	let floof = el.floofle;
	let counter = 0;

	// Get the follow elements, and create them if they don't exist
	let display = floof["p.counter"].actual;
	let button = floof["button.add"].actual;

	display.textContent = "0";
	button.textContent = "Click me!";

	button.onclick = () => display.textContent = (counter += 1);
}
</script>
```

## Reference

### interface **floofy**

**for** *(el: HTMLElement) => void*

> Executes the given function on all current and future elements that match the selector

readonly **actual** *HTMLElement*

> Returns the requested element, if it doesn't exist, it will be created to best match the selector

readonly **new** *HTMLElement*

> Creates as few elements as possible to best matching the selector, unlike `actual`, this will create at least one element regardless of whether it already exists

readonly **all** *NodeList*

> Returns all elements which match the selector, same as _querySelectorAll_

readonly **first** *HTMLElement*

> Returns the first element which matches the selector, same as _querySelector_

### interface **floofle**

[selector: *string*] => *floofy*

### String Prototype

readonly **floofy** *floofy*

> Returns a *floofy* selector from the string

> Note, this is the same as _document.body.floofle_[ **your string** ];

### HTMLElement Prototype

readonly **floofle**: *floofle*

> Returns a custom floofy context from the element
