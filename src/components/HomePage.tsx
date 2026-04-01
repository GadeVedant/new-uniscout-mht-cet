import { motion } from 'motion/react';
import { GraduationCap, Rocket, BookOpen, TrendingUp, Sparkles, Award, Users } from 'lucide-react';

interface HomePageProps {
  onPortalSelect: (portal: 'mht-cet' | 'ssc') => void;
}

export function HomePage({ onPortalSelect }: HomePageProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 relative z-10">
      {/* Main Content */}
      <div className="max-w-7xl w-full">
        {/* Header */}
        <motion.div
          className="text-center mb-20"
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <motion.div
            className="inline-flex items-center gap-4 mb-8"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          >
            <div className="relative">
              <GraduationCap className="w-20 h-20 text-blue-400" />
              <motion.div
                className="absolute -top-2 -right-2"
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Sparkles className="w-6 h-6 text-yellow-400" />
              </motion.div>
            </div>
            <h1 className="text-8xl font-black bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              UNISCOUT
            </h1>
          </motion.div>
          
          <motion.p
            className="text-2xl text-blue-100 max-w-4xl mx-auto leading-relaxed mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.8 }}
          >
            A college-based recommendation system based on{' '}
            <span className="font-bold text-pink-300">10th SSC marks</span> and{' '}
            <span className="font-bold text-cyan-300">MHT CET marks</span>
          </motion.p>

          {/* Stats */}
          <motion.div
            className="flex flex-wrap justify-center gap-6 mt-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <StatCard icon={<Users />} value="50,000+" label="Students Helped" />
            <StatCard icon={<Award />} value="200+" label="Top Colleges" />
            <StatCard icon={<TrendingUp />} value="95%" label="Accuracy Rate" />
          </motion.div>
        </motion.div>

        {/* Portal Cards */}
        <div className="grid lg:grid-cols-2 gap-10 max-w-6xl mx-auto">
          <PortalCard
            title="MHT CET Portal"
            subtitle="For Engineering Admissions"
            description="Get personalized engineering college recommendations based on your MHT CET percentile, preferred branch, and location"
            gradient="from-blue-600 via-cyan-600 to-blue-500"
            accentColor="cyan"
            delay={0.8}
            onClick={() => onPortalSelect('mht-cet')}
            icon={<Rocket className="w-14 h-14" />}
            features={['150+ Engineering Colleges', 'Branch-wise Analysis', 'Location Preferences']}
          />
          
          <PortalCard
            title="10th SSC Portal"
            subtitle="For Junior College Admissions"
            description="Discover the best junior colleges for Arts, Commerce, and Science streams based on your 10th SSC performance"
            gradient="from-purple-600 via-pink-600 to-purple-500"
            accentColor="pink"
            delay={1}
            onClick={() => onPortalSelect('ssc')}
            icon={<BookOpen className="w-14 h-14" />}
            features={['100+ Junior Colleges', 'Stream-wise Options', 'Merit-based Sorting']}
          />
        </div>

        {/* Trust Indicators */}
        <motion.div
          className="text-center mt-20"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
        >
          <p className="text-blue-300/80 text-lg mb-4">
            Trusted by thousands of students across Maharashtra
          </p>
          <div className="flex justify-center gap-3">
            {[1, 2, 3, 4, 5].map((star) => (
              <motion.div
                key={star}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 1.3 + star * 0.1 }}
              >
                <Award className="w-6 h-6 text-yellow-400 fill-yellow-400" />
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  value: string;
  label: string;
}

function StatCard({ icon, value, label }: StatCardProps) {
  return (
    <motion.div
      className="flex items-center gap-4 px-6 py-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl"
      whileHover={{ scale: 1.05, backgroundColor: "rgba(255, 255, 255, 0.15)" }}
    >
      <div className="text-blue-300">{icon}</div>
      <div>
        <div className="text-2xl font-bold text-white">{value}</div>
        <div className="text-sm text-blue-200/70">{label}</div>
      </div>
    </motion.div>
  );
}

interface PortalCardProps {
  title: string;
  subtitle: string;
  description: string;
  gradient: string;
  accentColor: string;
  delay: number;
  onClick: () => void;
  icon: React.ReactNode;
  features: string[];
}

function PortalCard({ title, subtitle, description, gradient, accentColor, delay, onClick, icon, features }: PortalCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.6 }}
      whileHover={{ scale: 1.02, y: -10 }}
      className="group cursor-pointer"
      onClick={onClick}
    >
      <div className="relative h-full bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/20 rounded-3xl p-10 overflow-hidden hover:border-white/40 transition-all duration-500 shadow-2xl hover:shadow-3xl">
        {/* Animated gradient background */}
        <motion.div 
          className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-20 transition-opacity duration-500`}
          animate={{
            backgroundPosition: ['0% 0%', '100% 100%'],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            repeatType: 'reverse',
          }}
        />
        
        {/* Content */}
        <div className="relative z-10">
          <div className="mb-6 text-white/90 group-hover:text-white transition-colors duration-300 group-hover:scale-110 transform transition-transform">
            {icon}
          </div>
          
          <h3 className="text-4xl font-black text-white mb-3 group-hover:tracking-wide transition-all duration-300">
            {title}
          </h3>
          <p className={`text-xl bg-gradient-to-r ${gradient} bg-clip-text text-transparent font-bold mb-6`}>
            {subtitle}
          </p>
          <p className="text-blue-100/80 leading-relaxed mb-8 text-lg">
            {description}
          </p>
          
          {/* Features */}
          <div className="space-y-3 mb-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                className="flex items-center gap-3 text-blue-200"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: delay + 0.2 + index * 0.1 }}
              >
                <div className={`w-2 h-2 rounded-full bg-${accentColor}-400`} />
                <span>{feature}</span>
              </motion.div>
            ))}
          </div>
          
          <motion.button
            className={`w-full py-5 rounded-2xl bg-gradient-to-r ${gradient} text-white font-bold text-xl shadow-2xl hover:shadow-3xl transition-all duration-300 relative overflow-hidden group`}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              Explore Now
              <motion.span
                animate={{ x: [0, 5, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                →
              </motion.span>
            </span>
            <motion.div
              className="absolute inset-0 bg-white/20"
              initial={{ x: '-100%' }}
              whileHover={{ x: '100%' }}
              transition={{ duration: 0.6 }}
            />
          </motion.button>
        </div>

        {/* Decorative elements */}
        <div className="absolute -right-12 -top-12 w-40 h-40 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-all duration-500" />
        <div className="absolute -left-12 -bottom-12 w-40 h-40 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-all duration-500" />
      </div>
    </motion.div>
  );
}