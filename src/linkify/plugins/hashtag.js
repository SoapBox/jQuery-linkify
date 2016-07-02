/**
	Quick Hashtag parser plugin for linkify
*/
export default function hashtag(linkify) {
	let
	inherits = linkify.inherits,
	TT = linkify.scanner.TOKENS, // Text tokens
	MT = linkify.parser.TOKENS, // Multi tokens
	MultiToken = MT.Base,
	S_START = linkify.parser.start,
	S_HASH, S_HASHTAG;

	function HASHTAG(value) {
		this.v = value;
	}

	inherits(MultiToken, HASHTAG, {
		type: 'hashtag',
		isLink: true
	});

	S_HASH = new linkify.parser.State();
	S_HASHTAG = new linkify.parser.State(HASHTAG);

	S_START.on(TT.POUND, S_HASH);
	S_HASH.on(TT.DOMAIN, S_HASHTAG);
	S_HASH.on(TT.TLD, S_HASHTAG);
}
