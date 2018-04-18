seach-removed-tweet
===================

ブログ等に埋め込まれているツイッターのツイートが、削除された／非公開になってしまったために見られなくなっていることがたまにあります。  
これを、残っているリンクのツイートIDを元にして Google で検索するためのユーザースクリプトです（うまくいけば、キャッシュ等が残っていて見られる可能性も）。  
※[元ネタはこちら→削除済みツイート検索 - Hatena::Let](http://let.hatelabo.jp/furyu-tei/let/hLHWysWQhfQI)  

インストール
------------
[Tampermonkey](http://tampermonkey.net/)を入れたブラウザで、  

> [search-removed-tweet.user.js](https://furyutei.github.io/seach-removed-tweet/src/js/search-removed-tweet.user.js)  

をクリックしてインストール。  


使い方
------
ツイートへのリンクをクリックしたとき、別タブにリンク先ツイートを開こうとします。  
この際、削除済み（404 Not found）もしくは非公開かどうかをチェックし、該当すればツイートIDを元にして Google 検索画面を開きます。 


不具合など
----------
ときどき、Google 検索画面の代わりに、「私はロボットではありません」という reCAPTCHA 画面が表示されてしまいます（[参考記事](https://plan-ltd.co.jp/plog/10367)）。  
今のところ、回避方法が見つかっていません。その場合はあきらめて、reCAPTCHAの難問に挑戦してください(苦笑)。  


ライセンス
----------
[The MIT License](https://github.com/furyutei/seach-removed-tweet/blob/master/LICENSE)  
