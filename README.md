# Floofy

A tiny and cuddly framework for building simple or lightweight web apps!

### Important notes for update 2020-10-27:
- `String.prototype.floofy` and `HTMLElement.prototype.floofle` have been deprecated, you should use `.f` instead.

- Fixed bug on `floofly.prototype.new` where it only created new elements, it now matches documented behaviour.

## Features

- Less than 5kB
- Native Typescript comparability
- Full documentation with examples

## Examples

### Selecting & Creating elements

[View on CodePen!](https://codepen.io/SirPandaNugget/pen/ZEOprRG)

```html
<div id="main">
	<button id="important-button">I'M IMPORTANT</button>
</div>
<script src="https://unpkg.com/floofy@2020.10.27/dist/floofy.min.js"></script>
<script>
// Create new elements
"#main h1.heading".f.new.textContent = "Hello world!";

// Find the first instance of an element
"#important-button".f.first.addEventListener("click", () => {
	// Alert out how many elements with tag button there are
	alert(`There are ${"button".f.all.length} buttons`);
});

// Find this specific button, and if it doesn't exist, create on
"#main button.some-button".f.actual.textContent = "There's only one of me!";
</script>	
```

### Components

[View on CodePen!](https://codepen.io/SirPandaNugget/pen/mdEmoyO)

```html
<ul id="buttons"></ul>
<button id="add-button">Add another button</button>
<script src="https://unpkg.com/floofy@2020.10.27/dist/floofy.min.js"></script>
<script>
"#buttons button".f.for = button => {
	button.textContent = "Hello " + ["world!", "there!", "floofy!"][Math.floor(Math.random() * 3)];
	button.onclick = () => alert(`This button says: "${button.textContent}"`);
}

"#add-button".f.first.onclick = () => "#buttons button".f.new;
</script>
```

### URL-Based behaviour

[View on CodePen!](https://codepen.io/SirPandaNugget/pen/pobPYLY)

```html
<section id="main" style="display: none">
	<input id="input" type="text" placeholder="Type something here!"/>
	<button id="submit">Submit</button>
</section>
<section id="text" style="display: none"></section>
<script src="https://unpkg.com/floofy@2020.10.27/dist/floofy.min.js"></script>
<script>
location.f["/text/$text"] = state => {
	"section".f.all.forEach(section => section.style.display = "none");
	"#text".f.first.style.display = "block";

	"#text h1".f.actual.textContent = state.$text;
}

location.f["**"] = () => {
	"section".f.all.forEach(section => section.style.display = "none");
	"#main".f.first.style.display = "block";
	
	"#submit".f.first.onclick = () => location.f[`/text/${"#input".f.first.value}`]({});
}
</script>
```

## Reference

### interface **floofy**

**for** *(el: HTMLElement) => void*

> Executes the given function on all current and future elements that match the selector

readonly **actual** *HTMLElement*

> Returns the requested element, if it doesn't exist, as many as needed will be created to best match the selector

readonly **new** *HTMLElement*

> Creates as few elements as possible to best matching the selector, unlike `actual`, this will create at least one element regardless of whether it already exists

readonly **all** *NodeList*

> Returns all elements which match the selector, same as _querySelectorAll_

readonly **first** *HTMLElement*

> Returns the first element which matches the selector, same as _querySelector_

### interface **floofle**

[selector: *string*] => *floofy*

### interface **page**

**set** [glob_selector: *string*] => (state: any) => void

> Is called when the url matches the `glob_selector`, this is checked on page load, or whenever **get** is called.

> Glob Syntax:
>
> Each _segment_ is delimited by a `/`
>
> `*` will match any one segment
> 
> `${name}` will match any one segment, and but the segment value into `state[${name}]`
>
> `**` will match all subsequent segments until the a different segment is matched

**get** [url: *string*] => (data: any) => void

> Pushes the given `url` to history, then searches for a page as normal. `data` will be joined with `history.state` and any url-based variables.

### String Prototype

readonly **f** *floofy*

> Returns a *floofy* selector from the string

> Note, this is the same as _document.f_ [ **your string** ];

### HTMLElement Prototype

readonly **f**: *floofle*

> Returns a custom floofy context from the element

### Location Prototype

readonly **f**: *page*