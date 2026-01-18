# TexTra Diff

※ このアドオンは、TexTraの非公式機能拡張版です。
翻訳結果がdiffエディタで表示されるのが特徴です。

このアドオンはVSCode上で翻訳を行います。  
また、RSTファイル、Markdownファイルの翻訳も行います。

## Extension Settings

## アドイン設定

- UI Language Setting is set in addon settings.

  UI 言語設定はアドオン設定で変更可能です。

- Set API parameters at first.    
  Execute "TexTra: API Settings" command on command palette(Ctrl + Shift + P.)  

  Copy "API Key" and "API Secret" from the site shown at the URL below.  
  "User Name" is Login ID on the site "Minna no Jido Hon'yaku".

  https://mt-auto-minhon-mlt.ucri.jgn-x.jp/content/api/

  最初に、API設定を行ってください。  
  コマンドパレット(Ctrl + Shift + P)で"TexTra: API Settings"を実行します。
  
  下記のページで"API Key"、"API Secret"を取得してください。  
  "User Name"はサイトログイン時に入力するユーザーネームを  
  入力してください。
  
  https://mt-auto-minhon-mlt.ucri.jgn-x.jp/content/api/
  
  ![https://mt-auto-minhon-mlt.ucri.jgn-x.jp/content/tool/chrome/img/image006.png](https://mt-auto-minhon-mlt.ucri.jgn-x.jp/content/tool/chrome/img/image006.png)
  
  ![https://mt-auto-minhon-mlt.ucri.jgn-x.jp/content/tool/chrome/img/image007.png](https://mt-auto-minhon-mlt.ucri.jgn-x.jp/content/tool/chrome/img/image007.png)
  
ここまでは公式版と同じです。

このフォーク版では、nicttextramod.translate.ja2en, nicttextramod.translate.en2ja, ... のようなコマンドを操作することによって、ポップアップに応答したりせずに一発で翻訳することが出来ます。また、複数選択による複数ヶ所の同時翻訳にも対応しており、翻訳結果は選択範囲に置換する形で反映させますが、そのままで確定するわけではありません。
diffエディタを用いて、翻訳結果を確認しながら「翻訳を適用」ボタンを押すことで、翻訳を承認するか却下するかを選択できます。

また、このフォーク版ではインデントや行頭の一致を認識します。そのため、インデント付き文字列を複数行選択してから翻訳することも可能です。
