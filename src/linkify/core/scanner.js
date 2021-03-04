/**
	The scanner provides an interface that takes a string of text as input, and
	outputs an array of tokens instances that can be used for easy URL parsing.

	@module linkify
	@submodule scanner
	@main scanner
*/
import {
	makeState,
	makeAcceptingState,
	t,
	makeT,
	makeMultiT,
	makeBatchT,
	makeChainT,
	accepts
} from './fsm';
import * as tk from './tokens/text';
import tlds from './tlds';

const NUMBERS = '0123456789'.split('');
const ALPHANUM = '0123456789abcdefghijklmnopqrstuvwxyz'.split('');
const WHITESPACE = [' ', '\f', '\r', '\t', '\v', '\u00a0', '\u1680', '\u180e']; // excluding line breaks

const domainStates = []; // states that jump to DOMAIN on /[a-z0-9]/


// Frequently used states
const S_START			= makeState();
const S_NUM				= makeAcceptingState(tk.NUM);
const S_DOMAIN			= makeAcceptingState(tk.DOMAIN);
const S_DOMAIN_HYPHEN	= makeState(); // domain followed by 1 or more hyphen characters
const S_WS				= makeAcceptingState(tk.WS);

// States for special URL symbols that accept immediately after start
makeBatchT(S_START, [
	['@', makeAcceptingState(tk.AT)],
	['.', makeAcceptingState(tk.DOT)],
	['+', makeAcceptingState(tk.PLUS)],
	['#', makeAcceptingState(tk.POUND)],
	['?', makeAcceptingState(tk.QUERY)],
	['/', makeAcceptingState(tk.SLASH)],
	['_', makeAcceptingState(tk.UNDERSCORE)],
	[':', makeAcceptingState(tk.COLON)],
	['{', makeAcceptingState(tk.OPENBRACE)],
	['[', makeAcceptingState(tk.OPENBRACKET)],
	['<', makeAcceptingState(tk.OPENANGLEBRACKET)],
	['(', makeAcceptingState(tk.OPENPAREN)],
	['}', makeAcceptingState(tk.CLOSEBRACE)],
	[']', makeAcceptingState(tk.CLOSEBRACKET)],
	['>', makeAcceptingState(tk.CLOSEANGLEBRACKET)],
	[')', makeAcceptingState(tk.CLOSEPAREN)],
	['&', makeAcceptingState(tk.AMPERSAND)]
]);

makeMultiT(S_START, [',', ';', '!', '"', '\''], makeAcceptingState(tk.PUNCTUATION));

// Whitespace jumps
// Tokens of only non-newline whitespace are arbitrarily long
makeT(S_START, '\n', makeAcceptingState(tk.NL));
makeMultiT(S_START, WHITESPACE, S_WS);

// If any whitespace except newline, more whitespace!
makeMultiT(S_WS, WHITESPACE, S_WS);

// Generates states for top-level domains
// Note that this is most accurate when tlds are in alphabetical order
for (let i = 0; i < tlds.length; i++) {
	const newStates = makeChainT(S_START, tlds[i], tk.TLD, tk.DOMAIN);
	domainStates.push.apply(domainStates, newStates);
}

// Collect the states generated by different protocls
const partialProtocolFileStates = makeChainT(S_START, 'file', tk.DOMAIN, tk.DOMAIN);
const partialProtocolFtpStates = makeChainT(S_START, 'ftp', tk.DOMAIN, tk.DOMAIN);
const partialProtocolHttpStates = makeChainT(S_START, 'http', tk.DOMAIN, tk.DOMAIN);
const partialProtocolMailtoStates = makeChainT(S_START, 'mailto', tk.DOMAIN, tk.DOMAIN);

// Add the states to the array of DOMAINeric states
domainStates.push.apply(domainStates, partialProtocolFileStates);
domainStates.push.apply(domainStates, partialProtocolFtpStates);
domainStates.push.apply(domainStates, partialProtocolHttpStates);
domainStates.push.apply(domainStates, partialProtocolMailtoStates);

// Protocol states
const S_PROTOCOL_FILE = partialProtocolFileStates.pop();
const S_PROTOCOL_FTP = partialProtocolFtpStates.pop();
const S_PROTOCOL_HTTP = partialProtocolHttpStates.pop();
const S_MAILTO = partialProtocolMailtoStates.pop();
const S_PROTOCOL_SECURE = makeAcceptingState(tk.DOMAIN);
const S_FULL_PROTOCOL = makeAcceptingState(tk.PROTOCOL); // Full protocol ends with COLON
const S_FULL_MAILTO = makeAcceptingState(tk.MAILTO); // Mailto ends with COLON

// Secure protocols (end with 's')

makeT(S_PROTOCOL_FTP, 's', S_PROTOCOL_SECURE);
makeT(S_PROTOCOL_FTP, ':', S_FULL_PROTOCOL);

makeT(S_PROTOCOL_HTTP, 's', S_PROTOCOL_SECURE);
makeT(S_PROTOCOL_HTTP, ':', S_FULL_PROTOCOL);

domainStates.push(S_PROTOCOL_SECURE);

// Become protocol tokens after a COLON
makeT(S_PROTOCOL_FILE, ':', S_FULL_PROTOCOL);
makeT(S_PROTOCOL_SECURE, ':', S_FULL_PROTOCOL);
makeT(S_MAILTO, ':', S_FULL_MAILTO);

// Localhost
const partialLocalhostStates = makeChainT(S_START, 'localhost', tk.LOCALHOST, tk.DOMAIN);
domainStates.push.apply(domainStates, partialLocalhostStates);

// Everything else
// DOMAINs make more DOMAINs
// Number and character transitions
makeMultiT(S_START, NUMBERS, S_NUM);
makeMultiT(S_NUM, NUMBERS, S_NUM);
makeMultiT(S_NUM, ALPHANUM, S_DOMAIN); // number becomes DOMAIN
makeT(S_NUM, '-', S_DOMAIN_HYPHEN);
makeT(S_DOMAIN, '-', S_DOMAIN_HYPHEN);
makeMultiT(S_DOMAIN, ALPHANUM, S_DOMAIN);

// All the generated states should have a jump to DOMAIN
for (let i = 0; i < domainStates.length; i++) {
	makeT(domainStates[i], '-', S_DOMAIN_HYPHEN);
	makeMultiT(domainStates[i], ALPHANUM, S_DOMAIN);
}

makeT(S_DOMAIN_HYPHEN, '-', S_DOMAIN_HYPHEN);
makeMultiT(S_DOMAIN_HYPHEN, NUMBERS, S_DOMAIN);
makeMultiT(S_DOMAIN_HYPHEN, ALPHANUM, S_DOMAIN);

// Set default transition
S_START.jd = makeAcceptingState(tk.SYM);

/**
	Given a string, returns an array of TOKEN instances representing the
	composition of that string.

	@method run
	@param {String} str Input string to scan
	@return {Array} Array of TOKEN instances
*/
export function run(str) {
	// State machine is not case sensitive, so input is tokenized in lowercased
	// form (still returns the regular case though) Uses selective `toLowerCase`
	// is used because lowercasing the entire string causes the length and
	// character position to vary in some non-English strings with V8-based
	// runtimes.
	let lowerStr = str.replace(/[A-Z]/g, (c) => c.toLowerCase());
	let len = str.length;
	let tokens = []; // return value

	var cursor = 0;

	// Tokenize the string
	while (cursor < len) {
		let state = S_START;
		let nextState = null;
		let tokenLength = 0;
		let latestAccepting = null;
		let sinceAccepts = -1;

		while (cursor < len && (nextState = t(state, lowerStr[cursor]))) {
			state = nextState;

			// Keep track of the latest accepting state
			if (accepts(state)) {
				sinceAccepts = 0;
				latestAccepting = state;
			} else if (sinceAccepts >= 0) {
				sinceAccepts++;
			}

			tokenLength++;
			cursor++;
		}

		if (sinceAccepts < 0) { continue; } // Should never happen

		// Roll back to the latest accepting state
		cursor -= sinceAccepts;
		tokenLength -= sinceAccepts;

		// No more jumps, just make a new token from the last accepting one
		// FIXME: Don't output v, instead output range where values ocurr
		tokens.push({
			t: latestAccepting.t, // token type/name
			v: str.substr(cursor - tokenLength, tokenLength) // string value
		});
	}

	return tokens;
}

export const start = S_START;
