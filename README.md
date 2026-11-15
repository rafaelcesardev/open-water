# Shark Night

Um mar escuro visto de cima, ao vivo, e os animais que passam por ele no tamanho real de cada um: tubarões (branco, martelo, tigre e galha-preta), baleia-azul, orca, golfinho, tartaruga-verde, manta, lula-gigante e um cardume de sardinhas. Desenhados como um mosaico de ladrilhos com letras, ou com o contorno liso.

- **Ao vivo:** nada é gravado. Cada animal decide na hora, com sorteio de verdade, então nenhum minuto se repete.
- **Só existe o que está na tela:** no máximo 4 animais por vez (o cardume conta como um). Cada um entra por uma borda sorteada, num ponto sorteado, fica um tempo e vai embora; quando sai inteiro da tela, deixa de existir, e daqui a pouco entra outro. O novo nunca é da espécie que acabou de sair, nem de uma que já está na tela.
- **Tamanho real:** 80 unidades por metro. A baleia-azul (24 m) ocupa quase a largura da tela; a tartaruga (1,2 m) é pequena perto dela; uma sardinha mede 22 cm.
- **Comportamento:**
  - passeiam, dão arrancadas e deslizam, cada espécie no seu ritmo: o golfinho é inquieto, a baleia quase não vira e só atravessa;
  - caçam o que caçam na vida real: a orca persegue tubarões, golfinhos e mantas; o tubarão-tigre persegue a tartaruga; o branco persegue o galha-preta, o golfinho e a tartaruga; golfinho e galha-preta vão atrás do cardume. A presa foge;
  - quando dois vão se cruzar, cada um prevê onde o outro vai estar e se afasta um pouco para o lado, cedo, sem parar. Quem vai de encontro ao corpo do outro diminui o ritmo para passar por trás, e o menor dá passagem ao maior. A baleia não muda de rumo por causa de uma tartaruga: o pequeno sai da frente, rápido;
  - o cardume anda junto e na mesma direção. Quando um animal grande passa no meio, ele se abre em volta e depois se junta de novo;
  - raramente uma nadadeira passa por cima de outro animal, como se estivessem em profundidades diferentes.
- **Movimento de cada corpo:** a simulação anda 60 vezes por segundo, e o corpo dobra ao longo do caminho que a cabeça fez.
  - os tubarões ondulam de um lado para o outro;
  - baleia, orca e golfinho batem a cauda para cima e para baixo e quase não balançam de lado;
  - o casco da tartaruga e o disco da manta são rígidos: a tartaruga rema com as nadadeiras da frente e plana, e a manta bate as asas devagar;
  - a lula vai com o manto à frente, em jatos, com os braços e os tentáculos atrás.
- **Cores reais vistas de cima:** o dorso de cada espécie, mais escuro no meio e mais claro para os lados. Orca e manta usam um preto levemente clareado, senão sumiriam no mar escuro.
- **Mosaico:** cada ladrilho acende inteiro com a cor do animal que está embaixo, um pouco mais claro ou mais escuro que os vizinhos, com uma letra recortada. As sardinhas são menores que um ladrilho, então cada uma acende o ladrilho em que está, e o cardume aparece como uma nuvem de ladrilhos.

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

- `style`: `'mosaic'` (padrão), os animais em ladrilhos com letras; ou `'smooth'`, o contorno liso.
- `zoomOut`: quão de longe o mar é visto. `1` é o tamanho original; maior mostra mais mar e animais menores. Padrão `1.5`.
- `cell`: tamanho do ladrilho do mosaico, em unidades do mar (1600 de largura com `zoomOut: 1`). Padrão `10`. Menor deixa o mosaico mais fino.
- `background`: cor da água. Padrão `#191919`.

Com "reduzir movimento" ligado no sistema, mostra uma cena parada.

## Código

- `src/sim.ts`: a simulação: espécies com tamanho e ritmo reais, entrada e saída, perseguição, fuga, desvio.
- `src/school.ts`: o cardume, peixe a peixe.
- `src/draw/`: o desenho de cada tipo de corpo (`shark`, `cetacean`, `turtle`, `ray`, `squid`, `school`).
- `src/index.ts`: o canvas (contorno e mosaico) e `mountSharkNight`.
- `shark-night.js`: tudo junto, pronto para o navegador.

Para gerar o `shark-night.js` de novo depois de mudar o código:

```bash
npx esbuild src/index.ts --bundle --format=esm --target=es2020 --outfile=shark-night.js
```
