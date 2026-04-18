import { motion } from "framer-motion";

const timeline = [
  { year: "2010", title: "Foundation", description: "Hamdard Public College officially established in Panthapath, Dhaka by Dr. Hakim Md. Yousuf Harun Bhuiyan." },
  { year: "2011", title: "First Batch", description: "First batch of students admitted to the college with Science, Business, and Humanities groups." },
  { year: "2014", title: "Top Ranking", description: "Ranked 19th among Dhaka Board colleges, establishing academic excellence early on." },
  { year: "2015", title: "100% Pass Rate", description: "Achieved 100% pass rate in HSC examinations — a feat repeated in 2016." },
  { year: "2018", title: "Olympiad Success", description: "Won 9 out of 10 prizes in the Bangladesh Botany Olympiad among 20 institutions." },
  { year: "2026", title: "Alumni Network", description: "HPC Alumni Association launches its digital platform to connect 1,500+ graduates." },
];

const HistorySection = () => {
  return (
    <section id="history" className="bg-background py-14 md:py-16">
      <div className="layout-container">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.5 }}
          className="mb-12 text-center"
        >
          <p className="fs-eyebrow mb-2 font-semibold tracking-wider text-primary">OUR JOURNEY</p>
          <h2 className="fs-title font-bold tracking-tight text-foreground">
            15 Years of <span className="text-gradient-hpc">Academic Excellence</span>
          </h2>
        </motion.div>

        <div className="relative mx-auto max-w-3xl">
          {/* Gradient vertical line */}
          <div className="absolute left-[23px] top-0 h-full w-px bg-gradient-to-b from-hpc-yellow via-primary to-hpc-orange-dark md:left-1/2 md:-translate-x-px" />

          {timeline.map((item, i) => (
            <motion.div
              key={item.year}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-30px" }}
              transition={{ duration: 0.5, delay: i * 0.05, ease: [0.2, 0, 0, 1] }}
              className={`relative mb-8 flex items-start gap-6 md:gap-0 ${
                i % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
              }`}
            >
              {/* Animated dot */}
              <div className="absolute left-[18px] top-1.5 z-10 md:left-1/2 md:-translate-x-1/2">
                <div className="h-[11px] w-[11px] rounded-full border-2 border-primary bg-background" />
                <div className="absolute inset-0 animate-ping rounded-full border-2 border-primary/30 bg-transparent" style={{ animationDuration: "3s" }} />
              </div>

              {/* Content */}
              <div className={`ml-12 w-full md:ml-0 md:w-[calc(50%-32px)] ${i % 2 === 0 ? "md:pr-0 md:text-right" : "md:pl-0"}`}>
                <span className="text-gradient-hpc fs-ui mb-1 inline-block font-mono font-bold">{item.year}</span>
                <h3 className="fs-card-title font-semibold text-foreground">{item.title}</h3>
                <p className="fs-ui mt-1 text-landing-description text-justify">{item.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HistorySection;
