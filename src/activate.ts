/** A record of secondary bindings for a given element and primary binding pair. */
interface ActivateBinding {
	spacebarFn: (this: HTMLElement, e: KeyboardEvent) => any;
	enterFn?: (this: HTMLElement, e: KeyboardEvent) => any;
}

/** An event listener that can accept keyboard or mouse events. */
interface ActivateEventListener {
	(this: HTMLElement, e: KeyboardEvent | MouseEvent): any
}

const boundEvents: Map<HTMLElement, Map<ActivateEventListener, ActivateBinding>> = new Map();

/**
 * Handles the conversion of the elements parameter so the activator function only ever has to deal with single HTMLElements.
 *
 * @param {string | HTMLElement | NodeListOf<HTMLElement>} elements - A CSS selector string, HTMLElement, or NodeList of HTMLElements to be converted so the activator function is called once for each resulting HTMLElement.
 * @param {ActivateEventListener} fn - The event listener to bind to each HTMLElement.
 * @param {(element: HTMLElement, fn: ActivateEventListener) => void} activator - The function to link each HTMLElement to fn.
 *
 * @throws {DOMException} - If the elements argument is an invalid CSS selector string.
 */
function _activator(
	elements: string | HTMLElement | NodeListOf<HTMLElement>,
	fn: ActivateEventListener,
	activator: (element: HTMLElement, fn: ActivateEventListener) => void,
): void {
	// Share the same initial logic between activate and deactivate,
	// but run a different function over each element

	if (typeof elements === 'string') {
		try {
			elements = document.querySelectorAll(elements);
		} catch (e) {
			const method = activator === _deactivateSingle ? 'deactivate' : 'activate';
			throw new DOMException(`${method} failed because it was passed an invalid selector string: '${elements}'`);
		}
	}

	if (elements instanceof HTMLElement) {
		activator(elements, fn);
	} else {
		elements.forEach((element) => activator(element, fn));
	}
}

/**
 * Binds fn to a single element.
 *
 * @param {HTMLElement} element
 * @param {ActivateEventListener} fn
 *
 * @throws {TypeError} - element must be an HTMLElement.
 */
function _activateSingle(element: HTMLElement, fn: ActivateEventListener): void {
	if (!(element instanceof HTMLElement)) {
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

/**
 * Unbinds fn from a single element.
 *
 * @param {HTMLElement} element
 * @param {ActivateEventListener} fn
 *
 * @throws {TypeError} - element must be an HTMLElement.
 */
function _deactivateSingle(element: HTMLElement, fn: ActivateEventListener): void {
	if (!(element instanceof HTMLElement)) {
		throw new TypeError(`deactivate failed because a valid HTMLElement was not passed`);
	}

	// All elements have had a click event bound
	element.removeEventListener('click', fn);

	const bindings = _getElementBindings(element, fn);
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
			element.removeEventListener('keydown', _preventSpacebarScroll);
		}
	}
}

/**
 * Record a new set of bindings for a particular element, associated with a new primary binding.
 *
 * @param {HTMLElement} element
 * @param {ActivateEventListener} fn - The primary binding.
 * @param {ActivateBinding} bindings - The secondary bindings.
 */
function _rememberElementBindings(element: HTMLElement, fn: ActivateEventListener, bindings: ActivateBinding): void {
	let elementB = boundEvents.get(element);

	if (!elementB) {
		elementB = new Map([[fn, bindings]]);
		boundEvents.set(element, elementB);
	}

	let fnB = elementB.get(fn);
	if (fnB) {
		Object.assign(fnB, bindings);
	} else {
		fnB = Object.assign({}, bindings);
		elementB.set(fn, fnB);
	}
}

/**
 * Delete any records of bindings for a particular element and primary binding pair.
 *
 * @param {HTMLElement} element
 * @param {ActivateEventListener} fn
 */
function _forgetElementBindings(element: HTMLElement, fn: ActivateEventListener): void {
	const elementB = boundEvents.get(element);
	if (!elementB) {
		return;
	}

	elementB.delete(fn);
	boundEvents.delete(element);
}

/**
 * Return the bindings for a particular element and primary binding pair.
 *
 * @param {HTMLElement} element
 * @param {ActivateEventListener} fn
 */
function _getElementBindings(element: HTMLElement, fn: ActivateEventListener): ActivateBinding | undefined {
	const elementB = boundEvents.get(element);

	if (!elementB) {
		return undefined;
	}

	const fnB = elementB.get(fn);

	return fnB;
}

/**
 * Checks whether or not any bindings are recorded for a particular element and primary binding pair.
 *
 * @param  {HTMLElement} element
 *
 * @return {boolean}
 */
function _getElementHasBindings(element: HTMLElement): boolean {
	return boundEvents.has(element);
}

function _makeEnterFn(fn: ActivateEventListener) {
	return function (this: HTMLElement, e: KeyboardEvent): any {
		const isEnter = _isEnter(e);

		if (isEnter) {
			return fn.call(this, e);
		}
	};
}

/**
 * For a given KeyboardEvent, checks if it was triggered by the 'enter' key.
 *
 * @param  {KeyboardEvent} e
 *
 * @return {boolean}
 */
function _isEnter(e: KeyboardEvent): boolean {
	const isEnter = !!(e.key && (e.key.toLowerCase() === 'enter'));

	return isEnter;
}

/**
 * For a given KeyboardEvent, if it was triggered by the 'spacebar' key, prevent the default action of scrolling the page.
 *
 * @param {KeyboardEvent} e
 */
function _preventSpacebarScroll(this: HTMLElement, e: KeyboardEvent): void {
	// Prevent spacebar from scrolling the page down on keydown
	const element = this;

	// Buttons and inputs don't have this default action of the 'spacebar' key, so don't prevent it.
	const isButton = element instanceof HTMLButtonElement;
	const isInput = element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement;

	const isSpacebar = _isSpacebar(e);

	if (!isButton && !isInput && isSpacebar) {
		e.preventDefault();
	}
}

/**
 * Create a secondary binding that calls fn when triggered via the spacebar.
 *
 * @param {ActivateEventListener} fn
 */
function _makeSpacebarFn(fn: ActivateEventListener) {
	return function (this: HTMLElement, e: KeyboardEvent): any {
		const isSpacebar = _isSpacebar(e);

		if (isSpacebar) {
			return fn.call(this, e);
		}
	};
}

/**
 * Checks if a given KeyboardEvent was triggered by the 'spacebar' key.
 *
 * @param  {KeyboardEvent} e
 *
 * @return {boolean}
 */
function _isSpacebar(e: KeyboardEvent): boolean {
	// IE11 uses 'spacebar' instead of ' '
	const isSpacebar = !!(e.key && (e.key === ' ' || e.key.toLowerCase() === 'spacebar'));

	return isSpacebar;
}

/**
 * Bind fn to all specified elements.
 *
 * @param {string | HTMLElement | NodeListOf<HTMLElement>} elements - The elements to have fn bound to them.
 * @param {ActivateEventListener} fn - The event listener to bind.
 *
 * @throws {DOMException} - If the elements argument is an invalid CSS selector string.
 */
function activate(elements: string | HTMLElement | NodeListOf<HTMLElement>, fn: ActivateEventListener): void {
	_activator(elements, fn, _activateSingle);
}

/**
 * Unbind fn from all specified elements.
 *
 * @param {string | HTMLElement | NodeListOf<HTMLElement>} elements - The elements to have fn unbound from them.
 * @param {ActivateEventListener} fn - The event listener to unbind.
 *
 * @throws {DOMException} - If the elements argument is an invalid CSS selector string.
 */
function deactivate(elements: string | HTMLElement | NodeListOf<HTMLElement>, fn: ActivateEventListener): void {
	_activator(elements, fn, _deactivateSingle);
}

export {
	activate,
	deactivate,

	ActivateEventListener,
};
export default activate;
