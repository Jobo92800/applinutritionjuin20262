# Guide de l'application, côté cliente

`guide.html` est la source du PDF « Guide application MAbeautyplus » (10 pages A4,
charte de l'app, Poppins). Les captures sont celles du banc de démo en mode
cliente.

Pour le refaire après un changement d'écran :

```bash
# 1. le banc en mode cliente + le serveur Vite (launch.json « nutrition »)
BANC_UI=1 BANC_CLIENTE=1 node tests/parcours/serveur.mjs
# 2. les captures (390×844, échelle 2, bandeau d'installation rogné ensuite)
CH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
for page in dashboard podcasts profil progress calendar account food-analysis; do
  "$CH" --headless=new --disable-gpu --hide-scrollbars --window-size=390,844 \
    --force-device-scale-factor=2 --virtual-time-budget=10000 \
    --screenshot="docs/guide-cliente/$page.png" "http://localhost:5174/?page=$page&demo=cliente"
done
# 3. le PDF
"$CH" --headless=new --disable-gpu --no-pdf-header-footer --virtual-time-budget=8000 \
  --print-to-pdf="Guide application MAbeautyplus.pdf" "file://$PWD/docs/guide-cliente/guide.html"
```

Le PDF livré est dans `~/Desktop/Nouveau Site MAbeautyplus/Guide application cliente/`.
