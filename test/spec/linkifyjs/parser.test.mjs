import { expect } from 'chai';
import { Text, Url, Email, Nl } from 'linkifyjs/src/multi.mjs';
import * as scanner from 'linkifyjs/src/scanner.mjs';
import * as parser from 'linkifyjs/src/parser.mjs';

/**
	[0] - Original text to parse (should tokenize first)
	[1] - The types of tokens the text should result in
	[2] - The values of the tokens the text should result in
*/
const tests = [
	['google.com', [Url], ['google.com']],
	['I like google.com the most', [Text, Url, Text], ['I like ', 'google.com', ' the most']],
	['I like Google.com the most', [Text, Url, Text], ['I like ', 'Google.com', ' the most']],
	[
		'there are two tests, brennan.com and nick.ca -- do they work?',
		[Text, Url, Text, Url, Text],
		['there are two tests, ', 'brennan.com', ' and ', 'nick.ca', ' -- do they work?'],
	],
	[
		'there are two tests!brennan.com. and nick.ca? -- do they work?',
		[Text, Url, Text, Url, Text],
		['there are two tests!', 'brennan.com', '. and ', 'nick.ca', '? -- do they work?'],
	],
	[
		'This [i.imgur.com/ckSj2Ba.jpg)] should also work',
		[Text, Url, Text],
		['This [', 'i.imgur.com/ckSj2Ba.jpg', ')] should also work'],
	],
	[
		'A link is http://nick.is.awesome/?q=nick+amazing&nick=yo%29%30hellp another is http://nick.con/?q=look',
		[Text, Url, Text, Url],
		[
			'A link is ',
			'http://nick.is.awesome/?q=nick+amazing&nick=yo%29%30hellp',
			' another is ',
			'http://nick.con/?q=look',
		],
	],
	[
		'SOme UrlS http://google.com https://google1.com google2.com google.com/search?q=potatoes+oven goo.gl/0192n1 google.com?q=asda test bit.ly/0912j www.bob.com indigo.dev.soapbox.co/mobile google.com/?q=.exe flickr.com/linktoimage.jpg',
		[
			Text,
			Url,
			Text,
			Url,
			Text,
			Url,
			Text,
			Url,
			Text,
			Url,
			Text,
			Url,
			Text,
			Url,
			Text,
			Url,
			Text,
			Url,
			Text,
			Url,
			Text,
			Url,
		],
		[
			'SOme UrlS ',
			'http://google.com',
			' ',
			'https://google1.com',
			' ',
			'google2.com',
			' ',
			'google.com/search?q=potatoes+oven',
			' ',
			'goo.gl/0192n1',
			' ',
			'google.com',
			'?q=asda test ',
			'bit.ly/0912j',
			' ',
			'www.bob.com',
			' ',
			'indigo.dev.soapbox.co/mobile',
			' ',
			'google.com/?q=.exe',
			' ',
			'flickr.com/linktoimage.jpg',
		],
	],
	['None.of these.should be.Links okay.please?', [Text], ['None.of these.should be.Links okay.please?']],
	[
		'Here are some random emails: nick@soapbox.com, nick@soapbox.soda (invalid), Nick@dev.dev.soapbox.co, random nick.frasser_hitsend@http://facebook.com',
		[Text, Email, Text, Email, Text, Url],
		[
			'Here are some random emails: ',
			'nick@soapbox.com',
			', nick@soapbox.soda (invalid), ',
			'Nick@dev.dev.soapbox.co',
			', random nick.frasser_hitsend@',
			'http://facebook.com',
		],
	],
	[
		't.c.com/sadqad is a great domain, so is ftp://i.am.a.b.ca/ okay?',
		[Url, Text, Url, Text],
		['t.c.com/sadqad', ' is a great domain, so is ', 'ftp://i.am.a.b.ca/', ' okay?'],
	],
	[
		'This port is too short someport.com: this port is too long http://googgle.com:789023/myQuery this port is just right https://github.com:8080/SoapBox/jQuery-linkify/',
		[Text, Url, Text, Url, Text, Url],
		[
			'This port is too short ',
			'someport.com',
			': this port is too long ',
			'http://googgle.com:789023/myQuery',
			' this port is just right ',
			'https://github.com:8080/SoapBox/jQuery-linkify/',
		],
	],
	[
		'The best Url http://google.com/?love=true, and t.co',
		[Text, Url, Text, Url],
		['The best Url ', 'http://google.com/?love=true', ', and ', 't.co'],
	],
	['Please email me at testy.test+123@gmail.com', [Text, Email], ['Please email me at ', 'testy.test+123@gmail.com']],
	[
		'http://aws.amazon.com:8080/nick?was=here and localhost:3000 are also domains',
		[Url, Text, Url, Text],
		['http://aws.amazon.com:8080/nick?was=here', ' and ', 'localhost:3000', ' are also domains'],
	],
	['http://500-px.com is a real domain?', [Url, Text], ['http://500-px.com', ' is a real domain?']],
	[
		'IP loops like email? 192.168.0.1@gmail.com! works!!',
		[Text, Email, Text],
		['IP loops like email? ', '192.168.0.1@gmail.com', '! works!!'],
	],
	['Url like bro-215.co; with a hyphen?', [Text, Url, Text], ['Url like ', 'bro-215.co', '; with a hyphen?']],
	[
		'This Url http://23456789098.sydney is a number',
		[Text, Url, Text],
		['This Url ', 'http://23456789098.sydney', ' is a number'],
	],
	[
		'This Url http://23456789098.sydney is a number',
		[Text, Url, Text],
		['This Url ', 'http://23456789098.sydney', ' is a number'],
	],
	[
		'A Url with only numbers is 123.456.ca another is //7.8.com/?wat=1 is valid',
		[Text, Url, Text, Url, Text],
		['A Url with only numbers is ', '123.456.ca', ' another is //', '7.8.com/?wat=1', ' is valid'],
	],
	[
		'Url Numbers 6.wat.78.where.eu and u.0.e.9.kp',
		[Text, Url, Text, Url],
		['Url Numbers ', '6.wat.78.where.eu', ' and ', 'u.0.e.9.kp'],
	],
	[
		'Emails like nick:f@gmail.com do not have colons in them',
		[Text, Email, Text],
		['Emails like nick:', 'f@gmail.com', ' do not have colons in them'],
	],
	[
		'Emails cannot have two dots, e.g.: nick..f@yahoo.ca',
		[Text, Email],
		['Emails cannot have two dots, e.g.: nick..', 'f@yahoo.ca'],
	],
	[
		'The `mailto:` part should be included in mailto:this.is.a.test@yandex.ru',
		[Text, Url],
		['The `mailto:` part should be included in ', 'mailto:this.is.a.test@yandex.ru'],
	],
	[
		'mailto:echalk-dev@logicify.com?Subject=Hello%20again is another test',
		[Url, Text],
		['mailto:echalk-dev@logicify.com?Subject=Hello%20again', ' is another test'],
	],
	[
		'Mailto is greedy mailto:localhost?subject=Hello%20World.',
		[Text, Url, Text],
		['Mailto is greedy ', 'mailto:localhost?subject=Hello%20World', '.'],
	],
	[
		'Emails like: test@42.domain.com and test@42.abc.11.domain.com should be matched in its entirety.',
		[Text, Email, Text, Email, Text],
		[
			'Emails like: ',
			'test@42.domain.com',
			' and ',
			'test@42.abc.11.domain.com',
			' should be matched in its entirety.',
		],
	],
	[
		"Bu haritanın verileri Direniş İzleme Grubu'nun yaptığı Türkiye İşçi Eylemleri haritası ile birleşebilir esasen. https://graphcommons.com/graphs/00af1cd8-5a67-40b1-86e5-32beae436f7c?show=Comments",
		[Text, Url],
		[
			"Bu haritanın verileri Direniş İzleme Grubu'nun yaptığı Türkiye İşçi Eylemleri haritası ile birleşebilir esasen. ",
			'https://graphcommons.com/graphs/00af1cd8-5a67-40b1-86e5-32beae436f7c?show=Comments',
		],
	],
	[
		'Links with brackets and parens https://en.wikipedia.org/wiki/Blur_[band] wat',
		[Text, Url, Text],
		['Links with brackets and parens ', 'https://en.wikipedia.org/wiki/Blur_[band]', ' wat'],
	],
	[
		'This has dots {https://msdn.microsoft.com/en-us/library/aa752574(VS.85).aspx}',
		[Text, Url, Text],
		['This has dots {', 'https://msdn.microsoft.com/en-us/library/aa752574(VS.85).aspx', '}'],
	],
	[
		// This test is correct, will count nested brackets as being part of the first
		'A really funky one (example.com/?id=asd2{hellow}and%20it%20continues(23&((@)) and it ends',
		[Text, Url, Text],
		['A really funky one (', 'example.com/?id=asd2{hellow}and%20it%20continues(23&((@)', ') and it ends'],
	],
	[
		'Url enclosed in angle brackets: <http://example.com/exemplary> should not include trailing bracket',
		[Text, Url, Text],
		['Url enclosed in angle brackets: <', 'http://example.com/exemplary', '> should not include trailing bracket'],
	],
	[
		'Url with angle brackets in it: http://example.com/exemplary_<remix> should be included',
		[Text, Url, Text],
		['Url with angle brackets in it: ', 'http://example.com/exemplary_<remix>', ' should be included'],
	],
	[
		'Force http:/ and http:// are not but http://a and http://b.local?qeasd3qas=23 are all links',
		[Text, Url, Text, Url, Text],
		['Force http:/ and http:// are not but ', 'http://a', ' and ', 'http://b.local?qeasd3qas=23', ' are all links'],
	],
	[
		'HTTP Auth Urls should work: http://username:password@example.com',
		[Text, Url],
		['HTTP Auth Urls should work: ', 'http://username:password@example.com'],
	],
	[
		'Trailing equal symbol should work: http://example.com/foo/bar?token=CtFOYuk0wjiqvHZF==',
		[Text, Url],
		['Trailing equal symbol should work: ', 'http://example.com/foo/bar?token=CtFOYuk0wjiqvHZF=='],
	],
	['"https://surrounded.by.quotes/"', [Text, Url, Text], ['"', 'https://surrounded.by.quotes/', '"']],
	[
		"More weird character in http://facebook.com/#aZ?/:@-._~!$&'()*+,;= that Url",
		[Text, Url, Text],
		['More weird character in ', "http://facebook.com/#aZ?/:@-._~!$&'()*+,;=", ' that Url'],
	],
	[
		'Email with a underscore is n_frasser@example.xyz asd',
		[Text, Email, Text],
		['Email with a underscore is ', 'n_frasser@example.xyz', ' asd'],
	],
	[
		'Url followed by nbsp: example.com/foo\u00a0bar',
		[Text, Url, Text],
		['Url followed by nbsp: ', 'example.com/foo', '\u00a0bar'],
	],
	[
		"A link in 'singlequote.club/wat' extra fluff at the end",
		[Text, Url, Text],
		["A link in '", 'singlequote.club/wat', "' extra fluff at the end"],
	],
	[
		'Email with mailsomething dot com domain in foo@mailsomething.com',
		[Text, Email],
		['Email with mailsomething dot com domain in ', 'foo@mailsomething.com'],
	],
	['http://über.de', [Url], ['http://über.de']],
	['www.öko.de', [Url], ['www.öko.de']],
	['www.🍕💩.ws i❤️.ws', [Url, Text, Url], ['www.🍕💩.ws', ' ', 'i❤️.ws']],
	[
		"o'malley@example.com.au", // Email with apostrophe
		[Email],
		["o'malley@example.com.au"],
	],
	['foohttp://example.com bar', [Text, Url, Text], ['foohttp://', 'example.com', ' bar']],
	['テストhttp://example.comテスト', [Text, Url], ['テスト', 'http://example.comテスト']],
	['file:/etc/motd', [Url], ['file:/etc/motd']],
	['file:///etc/motd', [Url], ['file:///etc/motd']],
	['~a@example.org', [Email], ['~a@example.org']],
	['~@example.org', [Email], ['~@example.org']],
	['~emersion/soju-dev@lists.sr.ht', [Email], ['~emersion/soju-dev@lists.sr.ht']],
	['test@example2.com', [Email], ['test@example2.com']],
	['noreply@500px.so', [Email], ['noreply@500px.so']],
	['http@example.com', [Email], ['http@example.com']],
	['mailto@example.com', [Email], ['mailto@example.com']],
	['http.org', [Url], ['http.org']],
	['http123.org', [Url], ['http123.org']],
	['http-help.org', [Url], ['http-help.org']],
	['view-source.net', [Url], ['view-source.net']],
	['steam.com', [Url], ['steam.com']],
	['Hello\nWorld', [Text, Nl, Text], ['Hello', '\n', 'World']],
	['And http://↑↑↓↓←→←→ba.tk/ is also a URL', [Text, Url, Text], ['And ', 'http://↑↑↓↓←→←→ba.tk/', ' is also a URL']],
	[
		'This Url www.drive1.com with www and digits also www.500px.com',
		[Text, Url, Text, Url],
		['This Url ', 'www.drive1.com', ' with www and digits also ', 'www.500px.com'],
	],
	[
		'Link 1(http://foo.com/blah_blah) Link 2(http://foo.com/blah_blah_(wikipedia)_(again))',
		[Text, Url, Text, Url, Text],
		['Link 1(', 'http://foo.com/blah_blah', ') Link 2(', 'http://foo.com/blah_blah_(wikipedia)_(again)', ')'],
	],
	[
		'Link 1（http://foo.com/blah_blah） Link 2（http://foo.com/blah_blah_(wikipedia)_(again)）',
		[Text, Url, Text, Url, Text],
		['Link 1（', 'http://foo.com/blah_blah', '） Link 2（', 'http://foo.com/blah_blah_(wikipedia)_(again)', '）'],
	],
	[
		'Link 1『http://foo.com/blah_blah』 Link 2『http://foo.com/blah_blah_(wikipedia)_(again)』',
		[Text, Url, Text, Url, Text],
		['Link 1『', 'http://foo.com/blah_blah', '』 Link 2『', 'http://foo.com/blah_blah_(wikipedia)_(again)', '』'],
	],
	[
		'https://google.com\ufffcthis', // object replacement character
		[Url, Text],
		['https://google.com', '\ufffcthis'],
	],
	['some string with somefile.mp4 token', [Text], ['some string with somefile.mp4 token']],
	['hp--community.force.com', [Url], ['hp--community.force.com']],
	['example@hp--community.force.com', [Email], ['example@hp--community.force.com']],
];

describe('linkifyjs/parser#run()', () => {
	let scannerStart, scannerTokens, start;

	before(() => {
		const result = scanner.init([
			['steam', true],
			['view-source', false],
		]);
		scannerStart = result.start;
		scannerTokens = result.tokens;

		start = parser.init(scannerTokens).start;
	});

	function makeTest(test) {
		return it('Tokenizes the string "' + test[0] + '"', () => {
			const [str, types, values] = test;
			const result = parser.run(start, str, scanner.run(scannerStart, str));
			expect(result.map((token) => token.v)).to.eql(values);
			expect(result.map((token) => token.toString())).to.eql(values);
			expect(result.map((token) => token.constructor)).to.eql(types);
		});
	}

	// eslint-disable-next-line mocha/no-setup-in-describe
	tests.map(makeTest, this);

	it('Correctly sets start and end indexes', () => {
		const input = 'Hello github.com!';
		const result = parser.run(start, input, scanner.run(scannerStart, input));
		expect(result.map((t) => t.toObject())).to.eql([
			{ type: 'text', value: 'Hello ', href: 'Hello ', isLink: false, start: 0, end: 6 },
			{ type: 'url', value: 'github.com', href: 'http://github.com', isLink: true, start: 6, end: 16 },
			{ type: 'text', value: '!', href: '!', isLink: false, start: 16, end: 17 },
		]);
	});
});
