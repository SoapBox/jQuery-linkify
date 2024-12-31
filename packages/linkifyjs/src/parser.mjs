/**
	Not exactly parser, more like the second-stage scanner (although we can
	theoretically hotswap the code here with a real parser in the future... but
	for a little URL-finding utility abstract syntax trees may be a little
	overkill).

	URL format: http://en.wikipedia.org/wiki/URI_scheme
	Email format: http://en.wikipedia.org/wiki/EmailAddress (links to RFC in
	reference)

	@module linkify
	@submodule parser
	@main run
*/

import { State, ta, tt } from './fsm.mjs';
import * as tk from './text.mjs';
import * as mtk from './multi.mjs';

const makeState = (arg) => new State(arg);

/**
 * Generate the parser multi token-based state machine
 * @param {{ groups: Collections<string> }} tokens
 */
export function init({ groups }) {
	// Types of characters the URL can definitely end in
	const qsAccepting = groups.domain.concat([
		tk.AMPERSAND,
		tk.ASTERISK,
		tk.AT,
		tk.BACKSLASH,
		tk.BACKTICK,
		tk.CARET,
		tk.DOLLAR,
		tk.EQUALS,
		tk.HYPHEN,
		tk.NUM,
		tk.PERCENT,
		tk.PIPE,
		tk.PLUS,
		tk.POUND,
		tk.SLASH,
		tk.SYM,
		tk.TILDE,
		tk.UNDERSCORE,
	]);

	// Types of tokens that can follow a URL and be part of the query string
	// but cannot be the very last characters
	// Characters that cannot appear in the URL at all should be excluded
	const qsNonAccepting = [
		tk.APOSTROPHE,
		tk.COLON,
		tk.COMMA,
		tk.DOT,
		tk.EXCLAMATION,
		tk.PERCENT,
		tk.QUERY,
		tk.QUOTE,
		tk.SEMI,
		tk.OPENANGLEBRACKET,
		tk.CLOSEANGLEBRACKET,
		tk.OPENBRACE,
		tk.CLOSEBRACE,
		tk.CLOSEBRACKET,
		tk.OPENBRACKET,
		tk.OPENPAREN,
		tk.CLOSEPAREN,
		tk.FULLWIDTHLEFTPAREN,
		tk.FULLWIDTHRIGHTPAREN,
		tk.LEFTCORNERBRACKET,
		tk.RIGHTCORNERBRACKET,
		tk.LEFTWHITECORNERBRACKET,
		tk.RIGHTWHITECORNERBRACKET,
		tk.FULLWIDTHLESSTHAN,
		tk.FULLWIDTHGREATERTHAN,
	];

	// For addresses without the mailto prefix
	// Tokens allowed in the localpart of the email
	const localpartAccepting = [
		tk.AMPERSAND,
		tk.APOSTROPHE,
		tk.ASTERISK,
		tk.BACKSLASH,
		tk.BACKTICK,
		tk.CARET,
		tk.DOLLAR,
		tk.EQUALS,
		tk.HYPHEN,
		tk.OPENBRACE,
		tk.CLOSEBRACE,
		tk.PERCENT,
		tk.PIPE,
		tk.PLUS,
		tk.POUND,
		tk.QUERY,
		tk.SLASH,
		tk.SYM,
		tk.TILDE,
		tk.UNDERSCORE,
	];

	// The universal starting state.
	/**
	 * @type State<Token>
	 */
	const Start = makeState();
	const Localpart = tt(Start, tk.TILDE); // Local part of the email address
	ta(Localpart, localpartAccepting, Localpart);
	ta(Localpart, groups.domain, Localpart);

	const Domain = makeState(),
		Scheme = makeState(),
		SlashScheme = makeState();
	ta(Start, groups.domain, Domain); // parsed string ends with a potential domain name (A)
	ta(Start, groups.scheme, Scheme); // e.g., 'mailto'
	ta(Start, groups.slashscheme, SlashScheme); // e.g., 'http'

	ta(Domain, localpartAccepting, Localpart);
	ta(Domain, groups.domain, Domain);

	const LocalpartAt = tt(Domain, tk.AT); // Local part of the email address plus @

	tt(Localpart, tk.AT, LocalpartAt); // close to an email address now

	// Local part of an email address can be e.g. 'http' or 'mailto'
	tt(Scheme, tk.AT, LocalpartAt);
	tt(SlashScheme, tk.AT, LocalpartAt);

	const LocalpartDot = tt(Localpart, tk.DOT); // Local part of the email address plus '.' (localpart cannot end in .)
	ta(LocalpartDot, localpartAccepting, Localpart);
	ta(LocalpartDot, groups.domain, Localpart);

	const EmailDomain = makeState();
	ta(LocalpartAt, groups.domain, EmailDomain); // parsed string starts with local email info + @ with a potential domain name
	ta(EmailDomain, groups.domain, EmailDomain);
	const EmailDomainDot = tt(EmailDomain, tk.DOT); // domain followed by DOT
	ta(EmailDomainDot, groups.domain, EmailDomain);

	const Email = makeState(mtk.Email); // Possible email address (could have more tlds)
	ta(EmailDomainDot, groups.tld, Email);
	ta(EmailDomainDot, groups.utld, Email);
	tt(LocalpartAt, tk.LOCALHOST, Email);

	// Hyphen can jump back to a domain name
	const EmailDomainHyphen = tt(EmailDomain, tk.HYPHEN); // parsed string starts with local email info + @ with a potential domain name
	tt(EmailDomainHyphen, tk.HYPHEN, EmailDomainHyphen);
	ta(EmailDomainHyphen, groups.domain, EmailDomain);
	ta(Email, groups.domain, EmailDomain);
	tt(Email, tk.DOT, EmailDomainDot);
	tt(Email, tk.HYPHEN, EmailDomainHyphen);

	// Final possible email states
	const EmailColon = tt(Email, tk.COLON); // URL followed by colon (potential port number here)
	/*const EmailColonPort = */ ta(EmailColon, groups.numeric, mtk.Email); // URL followed by colon and port number

	// Account for dots and hyphens. Hyphens are usually parts of domain names
	// (but not TLDs)
	const DomainHyphen = tt(Domain, tk.HYPHEN); // domain followed by hyphen
	const DomainDot = tt(Domain, tk.DOT); // domain followed by DOT
	tt(DomainHyphen, tk.HYPHEN, DomainHyphen);
	ta(DomainHyphen, groups.domain, Domain);
	ta(DomainDot, localpartAccepting, Localpart);
	ta(DomainDot, groups.domain, Domain);

	const DomainDotTld = makeState(mtk.Url); // Simplest possible URL with no query string
	ta(DomainDot, groups.tld, DomainDotTld);
	ta(DomainDot, groups.utld, DomainDotTld);
	ta(DomainDotTld, groups.domain, Domain);
	ta(DomainDotTld, localpartAccepting, Localpart);
	tt(DomainDotTld, tk.DOT, DomainDot);
	tt(DomainDotTld, tk.HYPHEN, DomainHyphen);
	tt(DomainDotTld, tk.AT, LocalpartAt);

	const DomainDotTldColon = tt(DomainDotTld, tk.COLON); // URL followed by colon (potential port number here)
	const DomainDotTldColonPort = makeState(mtk.Url); // TLD followed by a port number
	ta(DomainDotTldColon, groups.numeric, DomainDotTldColonPort);

	// Long URL with optional port and maybe query string
	const Url = makeState(mtk.Url);

	// URL with extra symbols at the end, followed by an opening bracket
	const UrlNonaccept = makeState(); // URL followed by some symbols (will not be part of the final URL)

	// Query strings
	ta(Url, qsAccepting, Url);
	ta(Url, qsNonAccepting, UrlNonaccept);
	ta(UrlNonaccept, qsAccepting, Url);
	ta(UrlNonaccept, qsNonAccepting, UrlNonaccept);

	// Become real URLs after `SLASH` or `COLON NUM SLASH`
	// Here works with or without scheme:// prefix
	tt(DomainDotTld, tk.SLASH, Url);
	tt(DomainDotTldColonPort, tk.SLASH, Url);

	// Note that domains that begin with schemes are treated slighly differently
	const SchemeColon = tt(Scheme, tk.COLON); // e.g., 'mailto:'
	const SlashSchemeColon = tt(SlashScheme, tk.COLON); // e.g., 'http:'
	const SlashSchemeColonSlash = tt(SlashSchemeColon, tk.SLASH); // e.g., 'http:/'

	const UriPrefix = tt(SlashSchemeColonSlash, tk.SLASH); // e.g., 'http://'

	// Scheme states can transition to domain states
	ta(Scheme, groups.domain, Domain);
	tt(Scheme, tk.DOT, DomainDot);
	tt(Scheme, tk.HYPHEN, DomainHyphen);
	ta(SlashScheme, groups.domain, Domain);
	tt(SlashScheme, tk.DOT, DomainDot);
	tt(SlashScheme, tk.HYPHEN, DomainHyphen);

	// Force URL with scheme prefix followed by anything sane
	ta(SchemeColon, groups.domain, Url);
	tt(SchemeColon, tk.SLASH, Url);
	tt(SchemeColon, tk.QUERY, Url);
	ta(UriPrefix, groups.domain, Url);
	ta(UriPrefix, qsAccepting, Url);
	tt(UriPrefix, tk.SLASH, Url);

	const bracketPairs = [
		[tk.OPENBRACE, tk.CLOSEBRACE], // {}
		[tk.OPENBRACKET, tk.CLOSEBRACKET], // []
		[tk.OPENPAREN, tk.CLOSEPAREN], // ()
		[tk.OPENANGLEBRACKET, tk.CLOSEANGLEBRACKET], // <>
		[tk.FULLWIDTHLEFTPAREN, tk.FULLWIDTHRIGHTPAREN], // （）
		[tk.LEFTCORNERBRACKET, tk.RIGHTCORNERBRACKET], // 「」
		[tk.LEFTWHITECORNERBRACKET, tk.RIGHTWHITECORNERBRACKET], // 『』
		[tk.FULLWIDTHLESSTHAN, tk.FULLWIDTHGREATERTHAN], // ＜＞
	];

	for (let i = 0; i < bracketPairs.length; i++) {
		const [OPEN, CLOSE] = bracketPairs[i];
		const UrlOpen = tt(Url, OPEN); // URL followed by open bracket

		// Continue not accepting for open brackets
		tt(UrlNonaccept, OPEN, UrlOpen);

		// Closing bracket component. This character WILL be included in the URL
		tt(UrlOpen, CLOSE, Url);

		// URL that beings with an opening bracket, followed by a symbols.
		// Note that the final state can still be `UrlOpen` (if the URL has a
		// single opening bracket for some reason).
		const UrlOpenQ = makeState(mtk.Url);
		ta(UrlOpen, qsAccepting, UrlOpenQ);

		const UrlOpenSyms = makeState(); // UrlOpen followed by some symbols it cannot end it
		ta(UrlOpen, qsNonAccepting);

		// URL that begins with an opening bracket, followed by some symbols
		ta(UrlOpenQ, qsAccepting, UrlOpenQ);
		ta(UrlOpenQ, qsNonAccepting, UrlOpenSyms);
		ta(UrlOpenSyms, qsAccepting, UrlOpenQ);
		ta(UrlOpenSyms, qsNonAccepting, UrlOpenSyms);

		// Close brace/bracket to become regular URL
		tt(UrlOpenQ, CLOSE, Url);
		tt(UrlOpenSyms, CLOSE, Url);
	}

	tt(Start, tk.LOCALHOST, DomainDotTld); // localhost is a valid URL state
	tt(Start, tk.NL, mtk.Nl); // single new line

	return { start: Start, tokens: tk };
}

/**
 * Run the parser state machine on a list of scanned string-based tokens to
 * create a list of multi tokens, each of which represents a URL, email address,
 * plain text, etc.
 *
 * @param {State<MultiToken>} start parser start state
 * @param {string} input the original input used to generate the given tokens
 * @param {Token[]} tokens list of scanned tokens
 * @returns {MultiToken[]}
 */
export function run(start, input, tokens) {
	let len = tokens.length;
	let cursor = 0;
	let multis = [];
	let textTokens = [];

	while (cursor < len) {
		let state = start;
		let secondState = null;
		let nextState = null;
		let multiLength = 0;
		let latestAccepting = null;
		let sinceAccepts = -1;

		while (cursor < len && !(secondState = state.go(tokens[cursor].t))) {
			// Starting tokens with nowhere to jump to.
			// Consider these to be just plain text
			textTokens.push(tokens[cursor++]);
		}

		while (cursor < len && (nextState = secondState || state.go(tokens[cursor].t))) {
			// Get the next state
			secondState = null;
			state = nextState;

			// Keep track of the latest accepting state
			if (state.accepts()) {
				sinceAccepts = 0;
				latestAccepting = state;
			} else if (sinceAccepts >= 0) {
				sinceAccepts++;
			}

			cursor++;
			multiLength++;
		}

		if (sinceAccepts < 0) {
			// No accepting state was found, part of a regular text token add
			// the first text token to the text tokens array and try again from
			// the next
			cursor -= multiLength;
			if (cursor < len) {
				textTokens.push(tokens[cursor]);
				cursor++;
			}
		} else {
			// Accepting state!
			// First close off the textTokens (if available)
			if (textTokens.length > 0) {
				multis.push(initMultiToken(mtk.Text, input, textTokens));
				textTokens = [];
			}

			// Roll back to the latest accepting state
			cursor -= sinceAccepts;
			multiLength -= sinceAccepts;

			// Create a new multitoken
			const Multi = latestAccepting.t;
			const subtokens = tokens.slice(cursor - multiLength, cursor);
			multis.push(initMultiToken(Multi, input, subtokens));
		}
	}

	// Finally close off the textTokens (if available)
	if (textTokens.length > 0) {
		multis.push(initMultiToken(mtk.Text, input, textTokens));
	}

	return multis;
}

export { mtk as tokens };

/**
 * Utility function for instantiating a new multitoken with all the relevant
 * fields during parsing.
 * @param {new (value: string, tokens: Token[]) => MultiToken} Multi class to instantiate
 * @param {string} input original input string
 * @param {Token[]} tokens consecutive tokens scanned from input string
 * @returns {MultiToken}
 */
function initMultiToken(Multi, input, tokens) {
	const startIdx = tokens[0].s;
	const endIdx = tokens[tokens.length - 1].e;
	const value = input.slice(startIdx, endIdx);
	return new Multi(value, tokens);
}
