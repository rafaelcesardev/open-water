# Open Water

Um mar escuro visto de cima, ao vivo, e os animais que passam por ele no tamanho real de cada um: tubarões (branco, martelo, tigre e galha-preta), baleia-azul, orca, golfinho, tartaruga-verde, manta, lula-gigante e um cardume de xaréus-olho-grande. Desenhados como um mosaico de ladrilhos com letras, ou com o contorno liso.

- **Ao vivo:** nada é gravado. Cada animal decide na hora, com sorteio de verdade, então nenhum minuto se repete.
- **Só existe o que está na tela:** no máximo 4 animais por vez (o cardume conta como um). Cada um entra por uma borda sorteada, num ponto sorteado, fica um tempo e vai embora; quando sai inteiro da tela, deixa de existir, e daqui a pouco entra outro. O novo nunca é da espécie que acabou de sair, nem de uma que já está na tela.
- **Tamanho real:** 80 unidades por metro. A baleia-azul (24 m) ocupa quase a largura da tela; a tartaruga (1,2 m) é pequena perto dela; cada xaréu do cardume mede 60 cm.
- **Comportamento:**
  - passeiam, dão arrancadas e deslizam, cada espécie no seu ritmo: o golfinho é inquieto, a baleia quase não vira e só atravessa;
  - caçam o que caçam na vida real: a orca persegue tubarões, golfinhos e mantas; o tubarão-tigre persegue a tartaruga; o branco persegue o galha-preta, o golfinho e a tartaruga; golfinho, tigre e martelo vão atrás do cardume. A presa foge;
  - quando dois no mesmo nível vão se cruzar, cada um prevê onde o outro vai estar e se afasta um pouco para o lado, cedo, sem parar. Quem vai de encontro ao corpo do outro diminui o ritmo para passar por trás, e o menor dá passagem ao maior. A baleia não muda de rumo por causa de uma tartaruga: o pequeno sai da frente, rápido;
  - o cardume (160 xaréus, o cardume prateado clássico das imagens de drone) anda junto, apertado e na mesma direção. Quando um animal grande passa no meio, ele se abre bem na frente da cabeça dele, as duas metades passam pelos lados, piscando prateado ao virar, e depois se juntam de novo;
  - cada um nada num de três níveis: 1, logo abaixo da superfície; 2, meia-água; 3, tão fundo que quase some. De vez em quando sobe ou desce, devagar, para outro dos níveis que a espécie costuma usar: baleia, orca, golfinho, tartaruga e manta ficam no 1 e no 2; o martelo e a lula-gigante, no 2 e no 3. Quem caça vai para o nível da presa. Animais em níveis diferentes não desviam um do outro: o mais raso passa por cima.
- **Movimento de cada corpo:** a simulação anda 60 vezes por segundo, e o corpo dobra ao longo do caminho que a cabeça fez.
  - os tubarões ondulam de um lado para o outro;
  - baleia, orca e golfinho batem a cauda para cima e para baixo e quase não balançam de lado;
  - o casco da tartaruga e o disco da manta são rígidos: a tartaruga rema com as nadadeiras da frente e plana, e a manta bate as asas devagar;
  - a lula vai com o manto à frente, em jatos, com os braços e os tentáculos atrás.
- **Cores reais vistas de cima:** o dorso de cada espécie, mais escuro no meio e mais claro para os lados. Orca e manta usam um preto levemente clareado, senão sumiriam no mar escuro. Quanto mais fundo, mais o animal se apaga na água: no estilo liso, a cor vai para a da água, um pouco mais azulada, e o contorno desfoca; no mosaico, os ladrilhos ficam transparentes (metade no nível 2, quase invisíveis no 3).
- **Superfície:** a luz que as ondulações da superfície focam (cáusticas) passa pelo dorso dos animais, presa à água enquanto eles nadam por baixo, mais forte nos rasos e mais fraca à noite.
- **Mosaico:** cada ladrilho acende inteiro com a cor do animal que está embaixo, um pouco mais claro ou mais escuro que os vizinhos, com uma letra recortada. Os xaréus são mais finos que um ladrilho, então cada um acende um traço de ladrilhos ao longo do corpo, e o cardume aparece como muitos traços paralelos, todos na mesma direção.

## Controles

Um painel flutuante à direita, de vidro fosco transparente (os animais aparecem passando por trás). No topo, quantos animais estão na tela, o botão de tema (sol para o claro, lua para o escuro) e o de pausa. Logo abaixo, os dois modos:

- **Mar aberto:** os animais entram e saem. Escolha quantos podem aparecer de uma vez (− 1 a 8 +) e quais espécies podem entrar, em botões agrupados (Tubarões, Mamíferos, Outros), com um ponto verde em quem está na tela agora. Desligar uma espécie, ou diminuir o número, faz os que sobram irem embora nadando, sem sumir de repente.
- **Observar:** um animal sozinho, para avaliar formato e movimento. Ele continua nadando, virando e acelerando como sempre, mas a câmera o acompanha e o mantém no meio da área livre. Partículas na água passam por ele e mostram o deslocamento. Os cartões mostram o tamanho real de cada um, e as setas ‹ › passam para o próximo animal. Em Profundidade (Raso, Meio, Fundo) se escolhe o nível dele; ao trocar, ele sobe ou desce até lá, devagar.

Valem para os dois modos: mosaico ou liso, luz da superfície ligada ou não, distância (perto ou longe), tamanho do ladrilho do mosaico e velocidade (0,5×, 1×, 2×).

Atalhos: `Espaço` pausa, `H` esconde o painel, `←` `→` trocam o animal observado, `Esc` volta ao mar aberto.

O painel recolhe num botão. Em tela estreita, ele já começa recolhido. As escolhas ficam salvas no navegador (menos o animal observado).

## Usar

Abra `index.html` por um servidor (módulos não carregam direto do arquivo):

```bash
npx serve .   # ou: bunx serve .
```

Num site, basta o `open-water.js` e um elemento para ocupar:

```html
<div id="sea" style="position:fixed;inset:0"></div>
<script type="module">
  import { mountOpenWater } from './open-water.js'
  const stop = mountOpenWater(document.getElementById('sea'), { style: 'mosaic', zoomOut: 1.5, cell: 10, controls: true })
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
- `surface`: `true` (padrão) liga a luz da superfície (cáusticas sobre os animais); `false` desliga.
- `background`: cor da água no tema escuro. Padrão `#191919`.
- `controls`: `true` mostra o painel de controles. Padrão `false`, para quem incorpora num site não ganhar um painel sem pedir. O `index.html` liga.

Com "reduzir movimento" ligado no sistema, mostra uma cena parada.

## Tema do app Claude (protótipo)

`theme/` é um mod do Claude Code que põe o mar atrás da conversa no app desktop e no celular, com as cores do app tiradas dele (só modo escuro). O app aceita como fundo um SVG sem script, redesenhado no máximo 10 vezes por segundo. Então o mod roda a simulação ele mesmo e, a cada 1,2 segundo, manda o trecho seguinte do mar como um SVG que se anima sozinho. Cada trecho já está pronto antes da troca, começa um décimo de segundo adiante (o tempo que o app leva para mostrá-lo) e traz 0,3 segundo a mais no fim, para continuar nadando se a troca atrasar. Continua ao vivo: cada trecho é simulado na hora.

- **Mosaico** (padrão): sem canvas, cada corpo é pintado numa grade de amostras (`src/mosaic.ts`), dois por dois por ladrilho, e o ladrilho acende onde o corpo cobre a maior parte dele, como na página. O SVG traz os ladrilhos do primeiro momento e, até 20 vezes por segundo, só os que mudaram. Os tons, as letras e as frestas são uma camada parada por cima, na cor da água, então só aparecem sobre um ladrilho aceso, e o app só redesenha onde os ladrilhos mudam. Cabem todas as espécies; o tema usa até 5 de uma vez, sem a baleia-azul e o cardume, que são os que mais acendem ladrilhos; quando o trecho passa do limite do app (131.072 caracteres), ele manda menos momentos por segundo.
- **Liso** (`style: 'smooth'`): o corpo desenhado, movido entre amostras por SMIL. Um animal por vez, e só os que cabem no limite (os quatro tubarões, orca, golfinho e manta).

Por enquanto sem cáusticas.

```bash
npm run theme                       # gera theme/hooks/backdrop.js a partir de src/backdrop.ts
claude --plugin-dir theme           # ou CLAUDE_CODE_PLUGIN_DIRS=theme
```

## Código

- `src/sim.ts`: a simulação: espécies com tamanho e ritmo reais, entrada e saída, perseguição, fuga, desvio. Não toca no navegador: cada mar guarda a própria largura, então dois podem rodar na mesma página.
- `src/sim.test.ts`: os testes da simulação, sem canvas.
- `src/school.ts`: o cardume, peixe a peixe.
- `src/draw/`: o desenho de cada tipo de corpo (`shark`, `cetacean`, `turtle`, `ray`, `squid`, `school`).
- `src/index.ts`: o canvas (contorno e mosaico) e `mountOpenWater`.
- `src/panel.ts`: o painel de controles.
- `open-water.js`: tudo junto, pronto para o navegador.
- `src/svg.ts`: um contexto de desenho que grava SVG em vez de pintar, e junta vários momentos num SVG animado.
- `src/mosaic.ts`: os ladrilhos do mosaico (os mesmos da página) e o mosaico sem canvas.
- `src/backdrop.ts`: o mar como fundo do app Claude; `theme/` é o mod que o usa.

Tudo é TypeScript; o único JavaScript é o gerado (`open-water.js` e `theme/hooks/backdrop.js`) e o `theme/hooks/make-colors.js`, copiado como veio do kit de mods do Claude Code. Funciona igual com Node ou Bun:

```bash
npm install      # ou: bun install
npm run check    # confere os tipos (ou: bun run check)
npm test         # testa a simulação (ou: bun test)
npm run build    # gera o open-water.js de novo (ou: bun run build)
```

Os imports levam a extensão `.ts`, então o Node roda o código-fonte direto, sem compilar.
