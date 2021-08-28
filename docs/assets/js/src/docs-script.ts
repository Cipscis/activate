import { activate, deactivate, ActivateEventListener } from '@cipscis/activate';
// import { activate, deactivate, ActivateEventListener } from '../../../../src/activate';

const increment: ActivateEventListener = function (this: HTMLElement, e: KeyboardEvent | MouseEvent) {
	e.preventDefault();

	const el = e.target as HTMLElement;
	const activateCount = el.getAttribute('data-activate-count');

	let activateNum = 0;
	if (activateCount) {
		activateNum = parseInt(activateCount, 10);
	}

	activateNum += 1;
	const activateStr = activateNum.toString();

	el.setAttribute('data-activate-count', activateStr);
};


// NodeList
const nodelist = document.querySelectorAll<HTMLElement>('.js-activate-nodelist');
activate(nodelist, increment);

// HTMLElement
const element = document.querySelector<HTMLElement>('.js-activate-element');
if (element) {
	activate(element, increment);
}

// string
const string = '.js-activate-string';
activate(string, increment);


// Element types
activate('.js-activate-types', increment);


// Deactivate
const counter = document.querySelector<HTMLElement>('.js-deactivate-counter');

if (counter) {
	activate('.js-deactivate-on', () => activate(counter, increment));
	activate('.js-deactivate-off', () => deactivate(counter, increment));
}
