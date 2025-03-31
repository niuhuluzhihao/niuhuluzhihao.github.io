### Fine-tune和prompt-tune。
1. full fine-tune，也叫全参微调，bert微调模型一直用的这种方法，全部参数权重参与更新以适配领域数据，效果好。

2. prompt-tune, 包括Prefix Tuning、Prompt Tuning、P-Tuning V1/V2到LoRA、QLoRA
```
部分模型参数参与微调，训练快，显存占用少，效果可能跟FT（fine-tune）比会稍有效果损失，但一般效果能打平。
```

### What is LoRA
LoRA（Low-Rank Adaptation)

LoRA的工作原理是将预训练模型的注意力矩阵或前馈网络矩阵分解为两个低秩矩阵的乘积，
其中这两个低秩矩阵被视为可学习的任务特定参数。

LoRA 的原理其实并不复杂，它的核心思想是在原始预训练语言模型旁边增加一个旁路，
做一个降维再升维的操作，来模拟所谓的 intrinsic rank（预训练模型在各类下游任务上泛化的过程其实就是在优化各类任务的公共低维本征（low-dimensional intrinsic）子空间中非常少量的几个自由参数）。
训练的时候固定预训练语言模型的参数，只训练降维矩阵 A 与升维矩阵 B。而模型的输入输出维度不变，输出时将 BA 与预训练语言模型的参数叠加。
用随机高斯分布初始化 A，用 0 矩阵初始化 B。这样能保证训练开始时，新增的通路BA=0从，而对模型结果没有影响。

在推理时，将左右两部分的结果加到一起即可，h=Wx+BAx=(W+BA)x，
所以，只要将训练完成的矩阵乘积BA跟原本的权重矩阵W加到一起作为新权重参数替换原始预训练语言模型的W即可，
不会增加额外的计算资源。


### How LoRA
使用矩阵分解(奇异值分解或特征值分解)将语言模型的参数矩阵分解为较低秩的近似矩阵

在参数矩阵分解之后，我们可以选择保留较低秩的近似矩阵

![img_1.png](../../pict/大模型知识/lora/img_1.png)
![img_3.png](../../pict/大模型知识/lora/img_3.png)
![img_4.png](../../pict/大模型知识/lora/img_4.png)
### Adapter Tuning 

![img.png](../../pict/大模型知识/lora/img.png)

如上图,将其嵌入 Transformer 的结构里面，
在训练时，固定住原来预训练模型的参数不变，只对新增的 Adapter 结构进行微调

![img_5.png](../../pict/大模型知识/lora/img_5.png)

见上图:固定模型参数(W0)不变,将小的可训练适配器层(ΔW = BA)附加到模型上,并且只训练适配器


### prefix-tuning
```text
想要更好的理解下文将讲的prefix-tuning/P-Tuning，便不得不提Pattern-Exploiting Training(PET)
所谓PET，主要的思想是借助由自然语言构成的模版(英文常称Pattern或Prompt)
将下游任务也转化为一个完形填空任务，这样就可以用BERT的MLM(mask language model)模型来进行预测了,用GPT这样的单向语言模型（LM）也可以
```
在输入token之前构造一段任务相关的virtual tokens作为Prefix
```text
相当于对于transformer的每一层 (不只是输入层，且每一层transformer的输入不是从上一层输出，而是随机初始化的embedding作为输入)，
都在真实的句子表征前面插入若干个连续的可训练的"virtual token" embedding，
这些伪token不必是词表中真实的词，而只是若干个可调的自由参数
```
```text
举个例子，对于table-to-text任务，context x 是序列化的表格，输出y是表格的文本描述，
使用GPT-2进行生成；对于文本摘要， x是原文， y是摘要，使用BART进行生成
1. 对于自回归(Autoregressive)模型，在句子前面添加前缀，得到z=[PREFIX;x;y]
2. 对Encoder-Decoder模型来说，Encoder和Decoder都增加了前缀，得到z=[PREFIX;x∣PREFIX′;y]
```
然后训练的时候只更新Prefix部分的参数，而Transformer中的预训练参数固定

![img_6.png](../../pict/大模型知识/lora/img_6.png)


### P-Tuning 
P-Tuning 是一种在预训练语言模型中微调参数的方法，以适应下游任务。它的核心思想是在预训练模型的特定层中引入一些额外的参数，并且在特定任务上对这些参数进行微调。这些额外的参数通常被称为任务特定层（Task-Specific Layer），它们被插入到预训练模型的某些层中，以捕捉任务特定的信息。

在 P-Tuning 中，我们对整个模型的参数进行微调，以使其适应特定任务的要求。这与 Adapter Tuning 不同，后者只调整了一小部分参数。在训练过程中，我们可以使用特定任务的数据对模型进行微调，以提高在该任务上的性能。

P-tuning v2是P-tuning的改进版本，它使用了更多的连续前缀表示来引导模型生成适应特定任务的输出。
采用Prefix-tuning的做法，在输入前面的每层加入可微调的参数

![img_7.png](../../pict/大模型知识/lora/img_7.png)

### P-tuning v2

P-Tuning v2 是对 P-Tuning 的进一步改进，其核心思想是使用少量的任务特定参数来引导模型学习特定任务的知识。与 P-Tuning 相比，P-Tuning v2 引入了更少的额外参数，并且更注重模型的参数复用性和效率。

在 P-Tuning v2 中，我们通常只在模型的最后几层或某些关键层上引入任务特定的参数。这些参数可以是全连接层、注意力机制的权重等。通过引入少量的参数，P-Tuning v2 旨在提高模型的参数利用率，并且在保持模型性能的同时减少了计算成本。

总的来说，P-Tuning 和 P-Tuning v2 都是为了提高预训练语言模型在特定任务上的性能而设计的技术。它们通过微调模型的参数或引入少量的任务特定参数来实现这一目的，从而使模型能够更好地适应不同的下游任务。


### Reference(参考文档)

* [模型微调方法](https://blog.csdn.net/v_JULY_v/article/details/132116949)
* [Tune简单理解](https://zhuanlan.zhihu.com/p/660721012)
* [微调总结](https://www.zhihu.com/tardis/zm/art/627642632?source_id=1003)
* [Github1页面](https://github.com/aceliuchanghong/chatglm3_6b_finetune)
* [Github2页面](https://github.com/aceliuchanghong/chatglm3-base-tuning)
* [Github3页面](https://github.com/aceliuchanghong/llm-action)
