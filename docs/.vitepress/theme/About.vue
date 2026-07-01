<script setup lang="ts">
import { ref } from 'vue'

const lang = ref<'zh' | 'en'>('zh')

const skills = [
  { label: '前后端', label_en: 'Full Stack', items: ['Python', 'Java', 'TypeScript', 'Vue', 'Angular', 'Kafka', 'SQL'] },
  { label: 'AI/ML', label_en: 'AI/ML', items: ['SVM', 'XGBoost', 'RNN', 'CNN', 'Keras', 'PyTorch', '知识图谱'] },
  { label: 'LLM', label_en: 'LLM', items: ['Agent', 'Function Calling', 'MCP', 'Prompt', 'RAG', 'Langchain', 'LlamaIndex', '微调', 'RLHF'] },
  { label: '工具', label_en: 'Tools', items: ['Git', 'Docker', 'K8s', 'Maven', 'Linux'] },
]

const honors = [
  { year: '2024', zh: '六部优秀员工（3/128）', en: 'Outstanding Employee (3/128)' },
  { year: '2023', zh: '有线研究院优秀毕业生（3/600）', en: 'Outstanding Graduate, Wireline Institute (3/600)' },
  { year: '2022', zh: '六部优秀新员工（1/10）', en: 'Outstanding New Employee (1/10)' },
]
</script>

<template>
  <div class="about-page">
    <span class="section-kicker">About Me</span>
    <section class="about-hero">
      <img class="about-avatar" src="https://github.com/niuhuluzhihao.png" alt="zhihao" />
      <div class="about-hero-info">
        <h1 class="about-name">zhihao <span class="about-alias">NiuHuLu</span></h1>
        <p class="about-role">大模型应用与 AI 工程化 · 算法工程师 @ 中兴通讯</p>
        <div class="about-links">
          <a href="https://github.com/niuhuluzhihao" target="_blank" class="about-link">GitHub</a>
          <a href="mailto:maozhihao788@gmail.com" class="about-link">Email</a>
        </div>
      </div>
    </section>

    <div class="about-tabs">
      <button :class="['about-tab', { active: lang === 'zh' }]" @click="lang = 'zh'">中文</button>
      <button :class="['about-tab', { active: lang === 'en' }]" @click="lang = 'en'">English</button>
    </div>

    <!-- 中文 -->
    <div v-if="lang === 'zh'" class="about-content">
      <p>Hey，我是<strong>zhihao</strong>（a.k.a. NiuHuLu），一个专注于大模型应用与 AI 工程化的算法工程师，硕士毕业于 <a href="https://www.hit.edu.cn/" target="_blank">哈尔滨工业大学</a>。</p>
      <p>现就职于 <strong>中兴通讯</strong>，从事基于大模型的智能运维 Agent 系统研发。从函数初筛到槽值提取全流程的 <strong>Text2API</strong> 算法设计，到多层 Agent 架构下的智能查询、诊断、问答系统构建，致力于将大模型能力落地于真实业务场景。在微服务架构、模型微调与部署、DevOps 体系等方面亦有丰富实践经验。</p>
      <p>在此之前，曾参与 AI 服务平台开发与 <strong>MQRNN</strong> 时序预测算法研究（应用于风险链路预测与流量预测），以及基于机器学习的功率预测准确性提升项目（涉及 MLP、XGBoost、ARIMA 等算法）。</p>

      <h3>🛠 技术栈</h3>
      <div class="skill-groups">
        <div v-for="s in skills" :key="s.label" class="skill-group">
          <span class="skill-label">{{ s.label }}</span>
          <div class="skill-tags">
            <span v-for="i in s.items" :key="i" class="skill-tag">{{ i }}</span>
          </div>
        </div>
      </div>

      <h3>🏆 荣誉</h3>
      <ul class="honor-list">
        <li v-for="h in honors" :key="h.year">
          <span class="honor-year">{{ h.year }}</span>{{ h.zh }}
        </li>
      </ul>
    </div>

    <!-- English -->
    <div v-else class="about-content">
      <p>Hey, I'm <strong>Maozhihao</strong> (a.k.a. NiuHuLu), an algorithm engineer focused on LLM applications and AI engineering. I earned my Master's degree from <a href="https://www.hit.edu.cn/" target="_blank">Harbin Institute of Technology</a>.</p>
      <p>Currently working at <strong>ZTE Corporation</strong>, building intelligent operations Agent systems powered by LLMs. My work spans from Text2API algorithm design to multi-layer Agent architectures for intelligent query, diagnosis, and Q&A systems. I also have extensive experience in microservices, model fine-tuning, deployment, and DevOps.</p>
      <p>Before that, I worked on AI service platform development and <strong>MQRNN</strong> time-series forecasting research (for risk-link and traffic prediction), as well as ML-based power forecasting accuracy improvement (MLP, XGBoost, ARIMA).</p>

      <h3>🛠 Tech Stack</h3>
      <div class="skill-groups">
        <div v-for="s in skills" :key="s.label_en" class="skill-group">
          <span class="skill-label">{{ s.label_en }}</span>
          <div class="skill-tags">
            <span v-for="i in s.items" :key="i" class="skill-tag">{{ i }}</span>
          </div>
        </div>
      </div>

      <h3>🏆 Honors</h3>
      <ul class="honor-list">
        <li v-for="h in honors" :key="h.year">
          <span class="honor-year">{{ h.year }}</span>{{ h.en }}
        </li>
      </ul>
    </div>
  </div>
</template>
