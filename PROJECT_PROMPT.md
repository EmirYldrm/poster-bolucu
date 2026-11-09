# Baskı Atölyesi — Proje Oluşturma Promptu

Aşağıdaki projeyi sıfırdan, çalışır ve test edilebilir şekilde oluştur. Bu metin tek başına yeterli bir ürün ve teknik gereksinim dokümanıdır. Önce proje dosyalarını ve mimariyi kur, sonra işlevleri tamamla; yalnızca görsel maket veya açıklama üretme.

## Ürün

Türkçe arayüzlü, tarayıcıda çalışan **Baskı Atölyesi** adlı bir baskı hazırlama uygulaması yap. Uygulamanın ilk ve şu an tek çalışan aracı **Poster Bölücü** olsun. Kullanıcı JPEG, PNG veya WEBP görsel(ler)ini seçip büyük bir poster boyutuna yerleştirebilmeli, posteri yazdırılabilir A4 sayfalarına bölebilmeli, sayfaları ve birleştirme yönergelerini içeren PDF'yi indirebilmelidir.

Görseller kullanıcı cihazından çıkmamalı; yükleme, önizleme, düzenleme ve PDF üretimi tamamen tarayıcıda gerçekleşmelidir. Harici servis, backend, hesap, analitik veya bulut depolama ekleme. Gizlilik bilgisini yükleme alanında açıkça göster.

## Teknoloji ve komutlar

- React 18, JavaScript ES modules ve Vite kullan.
- Stil için Tailwind CSS 3; PDF üretimi için `pdf-lib`; test için Vitest kullan.
- Temel komutlar: `npm run dev`, `npm test`, `npm run build`.
- Gereksiz bağımlılık ekleme. Kod mevcutsa depodaki adlandırma, biçimlendirme ve dosya yapısını koru.

## Uygulama iskeleti ve tasarım

- Tek sayfalı uygulama; gezinme hash tabanlı olsun (`#/`, `#/poster-bolucu`).
- Başlık çubuğunda uygulama adı, hazır araç bağlantıları ve açık/koyu tema düğmesi bulunsun.
- Ana sayfa büyük baskıyı A4 yazıcıyla hazırlamayı tanıtsın ve araç kartlarını göstersin. Poster Bölücü çalışır; Görsel Kırpma, DPI Dönüştürücü, Kolaj Şablonları ve Çerçeve Ekleme “Yakında” durumunda gösterilir, çalışıyormuş gibi sunulmaz.
- Poster Bölücü üç adımlı akış kullansın: **Görsel yükle → Boyut ve ayarlar → Önizle ve indir**. Önceden ziyaret edilmiş adımlara geri dönülebilsin.
- Duyarlı, erişilebilir ve sade bir baskı atölyesi görünümü oluştur. Açık/koyu temayı destekle; tercihi `localStorage`'da sakla ve ilk açılışta sistem tercihini kullan. Klavye odağı görünür, kontroller etiketli, durum/hata mesajları erişilebilir olsun. Azaltılmış hareket tercihini dikkate al.
- Tasarım token'ları açık/koyu modda CSS değişkenleriyle yönetilsin. Ekran metinleri tek bir Türkçe sözlükte bulunsun; bileşenlere metin gömmek yerine çeviri anahtarları kullan.

## Görsel yükleme ve yerleşim

- Çoklu dosya seçimi ve sürükle-bırak destekle; yalnızca `image/jpeg`, `image/png`, `image/webp` kabul et. Bozuk/uyumsuz dosyalar için dosya adıyla açık hata göster ve başarılı dosyaları işlemeye devam et.
- Her görsel için tam çözünürlüklü kaynak, yaklaşık 1600 px uzun kenarlı önizleme, yaklaşık 120 px küçük resim, piksel boyutları, adı ve benzersiz kimlik tut. Object URL'leri ilgili görsel silinince serbest bırak.
- Boyutları içeride milimetre (mm) olarak sakla. Arayüzde mm, cm ve inç birimlerini destekle; hazır boyutlar A3, A2, A1, A0, 50×70 cm ve 70×100 cm olsun. Dikey/yatay yön değişimi seçili boyutları döndürsün; özel ölçü girişi desteklensin.
- Görsel yerleşiminde en-boy oranı kilidi ve `contain` (sığdır), `cover` (kapla/kırp) seçenekleri bulunsun. Kilit kapalıyken görsel esnetilsin. Tek görsel ve ayrı poster modunda görsel hedef boyuta otomatik yerleşsin.
- Birden fazla görsel için kolaj (tek poster) ve her görseli ayrı poster olarak işleme seçeneklerini sun. Kolajda görseller tuvalde seçilebilsin, sürüklenebilsin, köşelerden yeniden boyutlandırılabilsin; seçili öğe döndürülebilsin, öne/arkaya alınabilsin, kaldırılabilsin ve ölçüleri girilebilsin. Ayrı poster modunda her görsel için ayrı poster sekmesi/önizlemesi olsun.
- Efektif DPI'yi hesapla, görsel başına göster ve 100 DPI altında kalite uyarısı ver. Tuval yakınlaştırması ve seçili öğenin görsel önizlemesi sunulsun.

## Akıllı Silgi

- Her görselden açılabilen, dikdörtgen seçimle silinecek alanı belirleyen bir modal oluştur.
- Seçimi çevresindeki piksellerden yatay/dikey enterpolasyonla doldur; işlemleri önizlemede göster. Geri al, seçimi temizle, sil, uygula ve kapat işlevleri olsun. Uygulama tam çözünürlüklü kaynak görsele de uygulansın; hatalar kullanıcıya bildirilsin. Görsel hiçbir zaman sunucuya gönderilmesin.

## A4 bölme algoritması

- Bölme hesapları UI'dan bağımsız, saf fonksiyonlar halinde ve tüm ölçüler mm cinsinden olsun.
- A4 portre ölçüsü 210×297 mm; yatayda bu ölçüleri değiştir. Kenar boşluğu ve bindirme ayarlanabilsin; varsayılanları sırasıyla 5 mm ve 10 mm yap.
- Yazdırılabilir alanı sayfa ölçüsünden iki kenar boşluğunu çıkararak hesapla. Bindirme, komşu parçaların hem kaplama hesabına hem PDF çıktısına yansısın. Her parçada sıfır tabanlı satır/sütun, x/y/eni/boyu, sağ/alt bindirme ve A1, B1 ... AA1 biçiminde sayfa kodu bulunsun.
- Geçersiz poster boyutu, kenar boşluğu ve bindirme değerlerini açık hatalarla reddet.
- Portre ve yatay A4 sonuçlarını karşılaştır. Öncelik az sayfa, sonra daha büyük ölçek, sonra daha az boşa giden kâğıt alanı; tam eşitlikte portre olsun.
- Akıllı sığdırma ayarı açıkken, belirlenen maksimum küçültme toleransı içinde posteri küçülterek daha az sayfalı ızgaraları dene. Toleransı aşma. Sonuçta satır/sütun, sayfa sayısı, yön, atık alanı ve gerekiyorsa küçültme miktarını göster.
- Ölçekli bölme hesabında kâğıt koordinatlarını ve poster koordinatlarını karıştırma; tuval, parça önizlemesi ve PDF aynı geometriyi göstermeli.

## Önizleme ve PDF

- Poster tuvalinde parça sınırlarını, sayfa kodlarını, bindirme alanlarını ve seçili/üzerine gelinen parçayı göster. Parçaya tıklanınca A4 sayfasının kenar boşlukları ve bindirmesiyle ayrıntılı modal önizlemesi açılsın; önceki/sonraki parçaya geçilebilsin.
- PDF'yi `pdf-lib` ile tamamen tarayıcıda üret. Her poster için sayfaları A4 dikey/yatay boyutunda ekle; poster bölgesini doğru sayfa koordinatlarından render et. Tam çözünürlüklü görüntü kullan, JPEG kalitesini baskıya uygun tut ve render çözünürlüğünü yaklaşık 100–300 DPI aralığında kaynak görsele göre seç.
- Kullanıcı seçeneklerine bağlı kesme/hizalama işaretleri, sayfa kodları ve komşu sayfalara yönlendiren birleştirme okları ekle. Her posterin sayfalarından önce isteğe bağlı bir birleştirme kılavuzu ekle; kılavuzda poster küçük resmi, sayfa ızgarası, kodlar, sıra ve bindirme bilgisi olsun.
- Çoklu ayrı poster çıktısında tüm posterleri aynı PDF'de üret; sayfa toplamını ve işlem ilerlemesini göster. PDF indirme dosya adı poster ölçülerini içersin. Oluşturma hataları sessizce yutulmasın ve geçici object URL'ler serbest bırakılsın.

## Mimari

İş mantığını yeniden kullanılabilir modüllere ayır:

- `lib/units`: birim dönüşümleri, yuvarlama ve hazır ölçüler.
- `lib/splitter`: A4 bölme, sayfa kodu, yön karşılaştırma ve akıllı sığdırma.
- `lib/posterLayout`: görsel yükleme/ölçekleme, yerleşim, DPI ve canvas render işlemleri.
- `lib/smartEraser`: saf piksel doldurma algoritması.
- `lib/pdf`: PDF sayfaları, işaretler, etiketler ve kılavuz üretimi.
- `components`: yükleyici, adım göstergesi, poster tuvali, sayfa önizleme modalı, akıllı silgi, tema düğmesi ve ortak form kontrolleri.
- `tools` ve `pages`: araç kaydı, ana sayfa ve Poster Bölücü ekranı.
- `i18n`: Türkçe sözlük ve çeviri fonksiyonu.

Bileşenlerde iş kurallarını çoğaltma; algoritmaları saf ve test edilebilir tut. Kullanıcı girdilerini doğrula, hataları görünür kıl ve var olan işlevleri koru.

## Test ve tamamlanma ölçütleri

- `splitter` testleri: 50×70 cm için yön karşılaştırması, tek sayfalık sınır durumu, bindirme/kenar boşluğu, tüm posterin kapsanması, sayfa kodları (AA dahil), akıllı sığdırma toleransı ve geçersiz girdiler.
- `smartEraser` testleri: seçili alanın çevre rengiyle doldurulması, seçim dışının korunması ve görüntü sınırlarının aşılmasının güvenli işlenmesi.
- `npm test` ve `npm run build` başarılı olmalı.
- Ana kullanıcı akışı baştan sona çalışmalı: görsel seç → poster ölçüsü/yerleşim/bölme ayarla → önizle → seçenekleri belirle → PDF indir. Ölçüler, ölçek, sayfa sayısı ve bindirme tüm ekranlarda tutarlı olmalı.
