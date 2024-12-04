---
layout: doc
title: ngx-linkifyjs · Documentation
---

`ngx-linkifyjs` is an Angular V7 wrapper for linkifyjs - a library for finding links in plain text and converting them 
to HTML &lt;a&gt; tags via linkifyjs and more <3.

#### Jump to

* [Demo](#demo)
* [Installation](#installation)
* [Usage](#usage)
  * [Pipe](#pipe) `NgxLinkifyjsPipe via | linkify`
  * [Service](#service) `NgxLinkifyjsService`
    * [Methods](#methods)
        * [linkify _(text: string): string_](#linkify_method)
        * [find](#find_method)
        * [test](#test_method)
  * [Configuration](#configuration)
* [Documentation](#documentation)


## Demo

View all the directives in action at [https://anthonynahas.github.io/ngx-linkifyjs](https://anthonynahas.github.io/ngx-linkifyjs)

## Dependencies

* [Angular](https://angular.io) (*requires* Angular 2 or higher, developed with 7.x) 

## Installation

Install above dependencies via *npm*. 

Now install `ngx-linkifyjs` via:
```shell
npm i -s ngx-linkifyjs
```

---
##### SystemJS
>**Note**: If you are using `SystemJS`, adjust your configuration to point to the UMD bundle.
In your systemjs config file, `map` needs to tell the System loader where to look for `ngx-linkifyjs`:
```js
map: {
  'ngx-linkifyjs': 'node_modules/ngx-linkifyjs/bundles/ngx-linkifyjs.umd.js',
}
```
---

Once installed you need to import the main module:
```js
import { NgxLinkifyjsModule } from 'ngx-linkifyjs';
```
The only remaining part is to list the imported module in your application module. The exact method will be slightly
different for the root (top-level) module for which you should end up with the code similar to (notice ` NgxLinkifyjsModule .forRoot()`):
```typescript
import { NgxLinkifyjsModule } from 'ngx-linkifyjs';

@NgModule({
  declarations: [AppComponent, ...],
  imports: [NgxLinkifyjsModule.forRoot(), ...],  
  bootstrap: [AppComponent]
})
export class AppModule {
}
```

Other modules in your application can simply import ` NgxLinkifyjsModule `:

```js
import { NgxLinkifyjsModule } from 'ngx-linkifyjs';

@NgModule({
  declarations: [OtherComponent, ...],
  imports: [NgxLinkifyjsModule, ...], 
})
export class OtherModule {
}
```


## Usage


Once the library is imported, you can use its components, directives and pipes in your Angular application:

### Pipe

`{{text | linkify}}`

```html
<span [innerHTML]="'Linkify the following URL: https://github.com/anthonynahas/ngx-linkifyjs and share it <3' | linkify"></span>
```

**result**: Linkify the following URL: [https://github.com/anthonynahas/ngx-linkifyjs](https://github.com/anthonynahas/ngx-linkifyjs) and share it <3

### Service

Inject the `NgxLinkifyjsService` service

```typescript
import {NgxLinkifyjsService, Link, LinkType} from 'ngx-linkifyjs';

constructor(public linkifyService: NgxLinkifyjsService) {
 } 
}
```

#### Methods

<a name="linkify_method"/>

#### linkify _(text: string): string_ 

Convert a basic text string to a valid linkified text

**Params**

*  **`text`** : _`String`_ Text to linkify --> to convert with links

**Returns** _`String`_  converted text with links


```typescript
import {NgxLinkifyjsService, Link, LinkType} from 'ngx-linkifyjs';

constructor(public linkifyService: NgxLinkifyjsService) {
  this.linkifyService.linkify('For help with GitHub.com, please email support@github.com');
  // result --> see below
 } 
}
```

```typescript
'For help with <a href=\"http://github.com\" class=\"linkified\" target=\"_blank\">GitHub.com</a>, please email <a href=\"mailto:support@github.com\" class=\"linkified\">support@github.com</a>'
```

<a name="find_method"/>

#### find _(text: string): Array<Link>_ 

Finds all links in the given string

**Params**

*  **text** : _`String`_ search text string

**Returns** _`Array<Link>`_ List of links where each element is a hash with properties type, value, and href:


* **type** is the type of entity found. Possible values are
  - `'url'`
  - `'email'`
  - `'hashtag'` (if Hashtag is enabled via config/default `true`)
  - `'mention'` (if Mention is enabled via config/default `true`)
* **value** is the original entity substring.
* **href** should be the value of this link's `href` attribute.

```typescript
import {Component, OnInit} from '@angular/core';
import {NgxLinkifyjsService, Link, LinkType} from 'ngx-linkifyjs';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent {
    
  constructor(public linkifyService: NgxLinkifyjsService) {
    const foundLinks: Link[] = this.linkifyService.find('Any links to github.com here? If not, contact test@example.com');
    
    // result - output --> see below 
  }
  
}
```

```typescript
// Result
[
  {
    type: LinkType.URL,
    value: 'github.com',
    href: 'http://github.com'
  },
  {
    type: LinkType.EMAIL,
    value: 'test@example.com',
    href: 'mailto:test@example.com'
  }
]
```

<a name="test_method"/>

#### test _(value: string | string[]): boolean_

Is the given string a link? Not to be used for strict validation - See [Caveats](caveats.html)

**Params**

* **value** : _`String`_ |  _`Array<String>`_  Test string

**Returns** _`Boolean`_


```typescript
import {Component, OnInit} from '@angular/core';
import {NgxLinkifyjsService} from 'ngx-linkifyjs';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent {
    
  constructor(public linkifyService: NgxLinkifyjsService) {
    this.linkifyService.test('github.com'); // return true
    this.linkifyService.test('dev@example.com'); // return true
    this.linkifyService.test(['github.com', 'email']); // return false
    this.linkifyService.test('helloWorld'); // return false
  }
}
```

#### Configuration


Enable/Disable the hash and mention.

The config argument is optional (defaults to `true`).

```typescript
import { NgxLinkifyjsModule } from 'ngx-linkifyjs';

@NgModule({
  declarations: [AppComponent, ...],
  imports: [NgxLinkifyjsModule.forRoot(
                  {
                    enableHash: false, // optional - default true
                    enableMention: false // optional - default true
                  }), ...],  
  bootstrap: [AppComponent]
})
export class AppModule {
}
```

take a look @ [@angular-material-extensions/link-preview](https://github.com/angular-material-extensions/link-preview) which is using `ngx-linkifyjs`

