/* Activate 2.0.0 */

// Binds event listeners to one or more elements that makes them behave
// like buttons, detecting both "click" events and also keydown for
// the "Enter" key and keyup for the "Space" key.

// Example usage:
// activate(nodeListOfElements, fn);
// activate(singleElement, fn);
// activate(selector, fn);

interface ActivateBinding {
	spacebarFn?: (this: HTMLElement, e: KeyboardEvent) => void;
	enterFn?: (this: HTMLElement, e: KeyboardEvent) => void;
}

interface ActivateEventListener {
	(this: HTMLElement, e: KeyboardEvent | MouseEvent): void
}

interface Activator {
	(element: HTMLElement, fn: ActivateEventListener): void;
}

const boundEvents: Map<HTMLElement, Map<ActivateEventListener, ActivateBinding>> = new Map();

function activate(elements: string | HTMLElement | NodeListOf<HTMLElement>, fn: ActivateEventListener) {
	_activator(elements, fn, _activateSingle);
}

function deactivate(elements: string | HTMLElement | NodeListOf<HTMLElement>, fn: ActivateEventListener) {
	_activator(elements, fn, _deactivateSingle);
}

function _activator(elements: string | HTMLElement | NodeListOf<HTMLElement>, fn: ActivateEventListener, activator: Activator): void {
	// Share the same initial logic between activate and deactivate,
	// but run a different function over each element

	if (typeof elements === 'string') {
		try {
			elements = document.querySelectorAll(elements);
		} catch (e) {
			let method = activator === _deactivateSingle ? 'deactivate' : 'activate';
			throw new DOMException(`${method} failed because it was passed an invalid selector string: '${elements}'`);
		}
	}

	if (elements instanceof HTMLElement) {
		activator(elements, fn);
	} else if (elements.length && elements.forEach) {
		elements.forEach((element) => activator(element, fn));
	}
}

function _activateSingle(element: HTMLElement, fn: ActivateEventListener) {
	if ((element instanceof HTMLElement === false)) {
		throw new TypeError(`activate failed because a valid HTMLElement was not passed`);
	}

	if (_getElementBindings(element, fn)) {
		// Like addEventListener, don't try to rebind new copies of the same events
		return;
	}

	// All nodes should bind the click event
	element.addEventListener('click', fn);

	// Buttons will already treat keyboard events like clicks,
	// so only bind them to other element types
	if (!(element instanceof HTMLButtonElement)) {
		if (_getElementHasBindings(element) === false) {
			// addEventListener would prevent this event being
			// bound multiple times, but be explicit that it is
			// only bound if the element has no other events bound
			element.addEventListener('keydown', _preventSpacebarScroll);
		}

		const spacebarFn = _makeSpacebarFn(fn);
		element.addEventListener('keyup', spacebarFn);

		const bindings: ActivateBinding = {
			spacebarFn
		};

		// Links already treat "enter" keydown like a click
		if (!(element instanceof HTMLAnchorElement)) {
			// Note that holding down "enter" will behave differently
			// for links in that it will only fire once, whereas for
			// non-links, including buttons, it will fire multiple times
			const enterFn = _makeEnterFn(fn);
			element.addEventListener('keydown', enterFn);

			bindings.enterFn = enterFn;
		}

		_rememberElementBindings(element, fn, bindings);
	}
}

function _deactivateSingle(element: HTMLElement, fn: ActivateEventListener) {
	if ((element instanceof HTMLElement === false)) {
		throw new TypeError(`deactivate failed because a valid HTMLElement was not passed`);
	}

	let bindings = _getElementBindings(element, fn);

	// All elements have had a click event bound
	element.removeEventListener('click', fn);

	if (!bindings) {
		// No other events to unbind
		return;
	}

	// Buttons will already treat keyboard events like clicks,
	// so they didn't have keyboard events bound to them
	if (!(element instanceof HTMLButtonElement)) {
		if (bindings.spacebarFn) {
			element.removeEventListener('keyup', bindings.spacebarFn);
		}

		// Links already treat "enter" keydown like a click,
		// so that event wasn't bound to them
		if (!(element instanceof HTMLAnchorElement)) {
			if (bindings.enterFn) {
				element.removeEventListener('keydown', bindings.enterFn);
			}
		}

		_forgetElementBindings(element, fn);

		if (_getElementHasBindings(element) === false) {
			// Only unbind this event if the element has no other bindings
			if (_preventSpacebarScroll) {
				if (_preventSpacebarScroll) {
					element.removeEventListener('keydown', _preventSpacebarScroll);
				}
			}
		}
	}
}

function _rememberElementBindings(element: HTMLElement, fn: ActivateEventListener, bindings: ActivateBinding) {
	let elementB = boundEvents.get(element);

	if (!elementB) {
		elementB = new Map([[fn, bindings]]);
		boundEvents.set(element, elementB);
	}

	let fnB = elementB.get(fn);
	if (!fnB) {
		fnB = {};
		elementB.set(fn, fnB);
	}

	Object.assign(fnB, bindings);
}

function _forgetElementBindings(element: HTMLElement, fn: ActivateEventListener) {
	const elementB = boundEvents.get(element);
	if (!elementB) {
		return;
	}

	elementB.delete(fn);
	boundEvents.delete(element);
}

function _getElementBindings(element: HTMLElement, fn: ActivateEventListener) {
	const elementB = boundEvents.get(element);

	if (!elementB) {
		return undefined;
	}

	const fnB = elementB.get(fn);

	return fnB;
}

function _getElementHasBindings(element: HTMLElement) {
	return boundEvents.has(element);
}

function _makeEnterFn(fn: ActivateEventListener) {
	return function (this: HTMLElement, e: KeyboardEvent) {
		const isEnter = _isEnter(e);

		if (isEnter) {
			fn.call(this, e);
		}
	};
}

function _isEnter(e: KeyboardEvent) {
	const isEnter = !!(e.key && (e.key.toLowerCase() === 'enter'));

	return isEnter;
}

function _preventSpacebarScroll(e: KeyboardEvent) {
	// Prevent spacebar from scrolling the page down on keydown
	const element = e.target;

	const isButton = element instanceof HTMLButtonElement;
	const isInput = element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement;

	const isSpacebar = _isSpacebar(e);

	if (!isButton && !isInput && isSpacebar) {
		e.preventDefault();
	}
}

function _makeSpacebarFn(fn: ActivateEventListener) {
	return function (this: HTMLElement, e: KeyboardEvent) {
		const isSpacebar = _isSpacebar(e);

		if (isSpacebar) {
			fn.call(this, e);
		}
	};
}

function _isSpacebar(e: KeyboardEvent) {
	// IE11 uses 'spacebar' instead of ' '
	const isSpacebar = !!(e.key && (e.key === ' ' || e.key.toLowerCase() === 'spacebar'));

	return isSpacebar;
}

export { activate, deactivate };
export default activate;
