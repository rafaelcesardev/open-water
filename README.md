# Shark Night

Um mar escuro visto de cima, ao vivo, e os animais que passam por ele no tamanho real de cada um: tubarões (branco, martelo, tigre e galha-preta), baleia-azul, orca, golfinho, tartaruga-verde, manta, lula-gigante e um cardume de xaréus-olho-grande. Desenhados como um mosaico de ladrilhos com letras, ou com o contorno liso.

- **Ao vivo:** nada é gravado. Cada animal decide na hora, com sorteio de verdade, então nenhum minuto se repete.
- **Só existe o que está na tela:** no máximo 4 animais por vez (o cardume conta como um). Cada um entra por uma borda sorteada, num ponto sorteado, fica um tempo e vai embora; quando sai inteiro da tela, deixa de existir, e daqui a pouco entra outro. O novo nunca é da espécie que acabou de sair, nem de uma que já está na tela.
- **Tamanho real:** 80 unidades por metro. A baleia-azul (24 m) ocupa quase a largura da tela; a tartaruga (1,2 m) é pequena perto dela; cada xaréu do cardume mede 60 cm.
- **Comportamento:**
  - passeiam, dão arrancadas e deslizam, cada espécie no seu ritmo: o golfinho é inquieto, a baleia quase não vira e só atravessa;
  - caçam o que caçam na vida real: a orca persegue tubarões, golfinhos e mantas; o tubarão-tigre persegue a tartaruga; o branco persegue o galha-preta, o golfinho e a tartaruga; golfinho, tigre e martelo vão atrás do cardume. A presa foge;
  - quando dois vão se cruzar, cada um prevê onde o outro vai estar e se afasta um pouco para o lado, cedo, sem parar. Quem vai de encontro ao corpo do outro diminui o ritmo para passar por trás, e o menor dá passagem ao maior. A baleia não muda de rumo por causa de uma tartaruga: o pequeno sai da frente, rápido;
  - o cardume (160 xaréus, o cardume prateado clássico das imagens de drone) anda junto, apertado e na mesma direção. Quando um animal grande passa no meio, ele se abre bem na frente da cabeça dele, as duas metades passam pelos lados, piscando prateado ao virar, e depois se juntam de novo;
  - raramente uma nadadeira passa por cima de outro animal, como se estivessem em profundidades diferentes.
- **Movimento de cada corpo:** a simulação anda 60 vezes por segundo, e o corpo dobra ao longo do caminho que a cabeça fez.
  - os tubarões ondulam de um lado para o outro;
  - baleia, orca e golfinho batem a cauda para cima e para baixo e quase não balançam de lado;
  - o casco da tartaruga e o disco da manta são rígidos: a tartaruga rema com as nadadeiras da frente e plana, e a manta bate as asas devagar;
  - a lula vai com o manto à frente, em jatos, com os braços e os tentáculos atrás.
- **Cores reais vistas de cima:** o dorso de cada espécie, mais escuro no meio e mais claro para os lados. Orca e manta usam um preto levemente clareado, senão sumiriam no mar escuro.
- **Mosaico:** cada ladrilho acende inteiro com a cor do animal que está embaixo, um pouco mais claro ou mais escuro que os vizinhos, com uma letra recortada. Os xaréus são mais finos que um ladrilho, então cada um acende um traço de ladrilhos ao longo do corpo, e o cardume aparece como muitos traços paralelos, todos na mesma direção.

## Controles

Um painel flutuante à direita, de vidro fosco transparente (os animais aparecem passando por trás), para mudar tudo ao vivo:

- **Observar:** escolha um animal para vê-lo sozinho, para avaliar formato e movimento. Ele continua nadando, virando e acelerando como sempre, mas a câmera o acompanha e o mantém no meio da área livre, enquadrado pelo tamanho dele. Partículas na água passam por ele e mostram o deslocamento. O painel mostra o tamanho real do animal. "Mar aberto" volta para o mar de onde ele parou.
- **Animais:** quantos podem aparecer de uma vez (1 a 8) e quais espécies podem entrar (com "Todas" e "Nenhuma"). Desligar uma espécie, ou diminuir o número, faz os que sobram irem embora nadando, sem sumir de repente.
- **Visual:** tema escuro ou claro, mosaico ou liso, zoom (que recomeça a cena) e o tamanho do ladrilho do mosaico.
- **Tempo:** velocidade 0,5×, 1× ou 2×, e pausar.

O painel recolhe num botão. Em tela estreita, ele já começa recolhido. As escolhas ficam salvas no navegador.

## Usar

Abra `index.html` por um servidor (módulos não carregam direto do arquivo):

```bash
npx serve .
```

Num site, basta o `shark-night.js` e um elemento para ocupar:

```html
<div id="sea" style="position:fixed;inset:0"></div>
<script type="module">
  import { mountSharkNight } from './shark-night.js'
  const stop = mountSharkNight(document.getElementById('sea'), { style: 'mosaic', zoomOut: 1.5, cell: 10, controls: true })
  // stop() para remover
</script>
```

Opções:

- `style`: `'mosaic'` (padrão), os animais em ladrilhos com letras; ou `'smooth'`, o contorno liso.
- `zoomOut`: quão de longe o mar é visto. `1` é o tamanho original; maior mostra mais mar e animais menores. Padrão `1.5`.
- `cell`: tamanho do ladrilho do mosaico, em unidades do mar (1600 de largura com `zoomOut: 1`). Padrão `10`. Menor deixa o mosaico mais fino.
- `theme`: `'dark'` (padrão), o mar à noite; ou `'light'`, água clara.
- `atOnce`: quantos animais no máximo de uma vez (o cardume conta como um). Padrão `4`.
- `species`: as espécies que podem entrar, por nome (`'white'`, `'hammer'`, `'tiger'`, `'blacktip'`, `'blue'`, `'orca'`, `'dolphin'`, `'turtle'`, `'manta'`, `'squid'`, `'jacks'`). Padrão: todas.
- `speed`: velocidade do tempo. `1` é tempo real. Padrão `1`.
- `background`: cor da água no tema escuro. Padrão `#191919`.
- `controls`: `true` mostra o painel de controles. Padrão `false`, para quem incorpora num site não ganhar um painel sem pedir. O `index.html` liga.

Com "reduzir movimento" ligado no sistema, mostra uma cena parada.

## Código

- `src/sim.ts`: a simulação: espécies com tamanho e ritmo reais, entrada e saída, perseguição, fuga, desvio.
- `src/school.ts`: o cardume, peixe a peixe.
- `src/draw/`: o desenho de cada tipo de corpo (`shark`, `cetacean`, `turtle`, `ray`, `squid`, `school`).
- `src/index.ts`: o canvas (contorno e mosaico) e `mountSharkNight`.
- `src/panel.ts`: o painel de controles.
- `shark-night.js`: tudo junto, pronto para o navegador.

Para gerar o `shark-night.js` de novo depois de mudar o código:

```bash
npx esbuild src/index.ts --bundle --format=esm --target=es2020 --outfile=shark-night.js
```
