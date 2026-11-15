# Shark Night

Quatro tubarões vistos de cima (branco, martelo, tigre e galha-preta) nadando ao vivo num mar escuro, desenhados como um mosaico de ladrilhos com letras, ou com o contorno liso.

- **Ao vivo:** nada é gravado. Cada tubarão decide na hora, com sorteio de verdade, então nenhum minuto se repete.
- **Comportamento:** passeiam, dão arrancadas e deslizam. Quando um maior chega por trás de um menor, pode persegui-lo, e o menor foge. Quando dois vão se cruzar, cada um prevê onde o outro vai estar e se afasta um pouco para o lado, cedo, sem parar; quem vai de encontro ao corpo do outro também diminui o ritmo para passar por trás. Raramente uma nadadeira passa por cima da outra, como se estivessem em profundidades diferentes.
- **Movimento:** a simulação anda 60 vezes por segundo. O corpo dobra ao longo do caminho que a cabeça fez, e a cauda bate conforme ele nada.
- **Contorno de cada espécie:**
  - focinho arredondado, corpo mais largo no primeiro terço e afinando até a base da cauda;
  - nadadeiras peitorais em foice e nadadeiras pélvicas;
  - a cauda vista de cima, como uma lâmina estreita, e a nadadeira dorsal como uma crista escura;
  - o martelo com a cabeça larga, os olhos nas pontas e o corpo grosso logo atrás;
  - o tigre com faixas e o galha-preta com as pontas das nadadeiras pretas.
- **Mosaico:** cada ladrilho acende inteiro com a cor do tubarão que está embaixo, um pouco mais claro ou mais escuro que os vizinhos, com uma letra recortada.

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
  const stop = mountSharkNight(document.getElementById('sea'), { style: 'mosaic', zoomOut: 1.5, cell: 10 })
  // stop() para remover
</script>
```

Opções:

- `style`: `'mosaic'` (padrão), os tubarões em ladrilhos com letras; ou `'smooth'`, o contorno liso.
- `zoomOut`: quão de longe o mar é visto. `1` é o tamanho original; maior mostra mais mar e tubarões menores. Padrão `1.5`.
- `cell`: tamanho do ladrilho do mosaico, em unidades do mar (1600 de largura com `zoomOut: 1`). Padrão `10`. Menor deixa o mosaico mais fino.
- `background`: cor da água. Padrão `#191919`.

Com "reduzir movimento" ligado no sistema, mostra uma cena parada.

## Código

- `src/sim.ts`: a simulação (espécies, tubarões, perseguição, fuga, desvio).
- `src/index.ts`: o desenho no canvas (contorno e mosaico) e `mountSharkNight`.
- `shark-night.js`: os dois juntos, prontos para o navegador.

Para gerar o `shark-night.js` de novo depois de mudar o código:

```bash
npx esbuild src/index.ts --bundle --format=esm --target=es2020 --outfile=shark-night.js
```
