import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Sparkles, MapPin, BookOpen, Calendar, Users, Award, Info, CheckCircle2 } from 'lucide-react';
import { MhtCetFormData } from '../App';

interface MhtCetPortalProps {
  onSubmit: (data: MhtCetFormData) => void;
  onBack: () => void;
  isLoading?: boolean;
  error?: string | null;
}

const engineeringBranches = [
  'Artificial Intelligence and Data Science',
  'Artificial Intelligence and Machine Learning',
  'Civil Engineering',
  'Computer Engineering',
  'Computer Science and Engineering',
  'Electrical Engineering',
  'Electronics and Telecommunication Engineering',
  'Information Technology',
  'Mechanical Engineering',
];

const maharashtraDistricts = [
  'Thane', 'Pune', 'Ahmednagar', 'Sangli', 'Mumbai', 'Kolhapur', 
  'Aurangabad', 'Nagpur', 'Akola', 'Amravati', 'Chandrapur', 
  'Dhule', 'Hingoli', 'Jalgaon', 'Satara', 'Latur', 'Nanded', 
  'Nashik', 'Osmanabad', 'Ratnagiri', 'Solapur', 'Pandharpur'
];

export function MhtCetPortal({ onSubmit, onBack, isLoading = false, error = null }: MhtCetPortalProps) {
  const [formData, setFormData] = useState<MhtCetFormData>({
    percentile: '',
    year: '2025',
    capRound: 'I',
    category: 'Open',
    branchPreference: '',
    location: '',
  });

  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [completedFields, setCompletedFields] = useState<Set<string>>(new Set());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (field: keyof MhtCetFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (value) {
      setCompletedFields(prev => new Set(prev).add(field));
    }
  };

  const progress = (completedFields.size / 6) * 100;

  return (
    <div className="min-h-screen px-4 py-8 relative z-10">
      <div className="max-w-5xl mx-auto">
        {/* Header with Back Button */}
        <div className="flex items-center justify-between mb-12">
          <motion.button
            onClick={onBack}
            className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-blue-200 hover:text-blue-100 transition-all backdrop-blur-sm"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            whileHover={{ x: -5, scale: 1.05 }}
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-semibold">Back</span>
          </motion.button>

          {/* Progress indicator */}
          <motion.div
            className="hidden md:flex items-center gap-3 px-6 py-3 bg-white/10 border border-white/20 rounded-xl backdrop-blur-sm"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <span className="text-blue-200 text-sm font-medium">Progress</span>
            <div className="w-32 h-2 bg-white/20 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-cyan-400 to-blue-500"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <span className="text-cyan-300 font-bold text-sm">{Math.round(progress)}%</span>
          </motion.div>
        </div>

        {/* Main Header */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-4 mb-6 relative">
            <motion.div
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            >
              <Sparkles className="w-12 h-12 text-cyan-400" />
            </motion.div>
            <h1 className="text-6xl font-black bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
              MHT CET Portal
            </h1>
            <motion.div
              animate={{ rotate: [0, -360] }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            >
              <Sparkles className="w-12 h-12 text-blue-400" />
            </motion.div>
          </div>
          <p className="text-blue-100 text-xl">Find your perfect engineering college</p>
          <motion.div
            className="mt-6 inline-flex items-center gap-2 px-5 py-2 bg-cyan-500/20 border border-cyan-400/30 rounded-full text-cyan-300 text-sm"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Info className="w-4 h-4" />
            <span>Fill in your details to get personalized recommendations</span>
          </motion.div>
        </motion.div>

        {/* Error Alert */}
        <AnimatePresence>
          {error && (
            <motion.div
              className="mb-8 p-4 bg-red-500/20 border border-red-400/30 rounded-xl text-red-300"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <p className="font-semibold">Error:</p>
              <p>{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form */}
        <motion.form
          onSubmit={handleSubmit}
          className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-2xl border border-white/20 rounded-3xl p-10 shadow-2xl"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          <div className="grid md:grid-cols-2 gap-8">
            {/* Percentile */}
            <FormField
              label="Enter Your Percentile"
              icon={<Award className="w-5 h-5" />}
              delay={0.3}
              isFocused={focusedField === 'percentile'}
              isCompleted={completedFields.has('percentile')}
            >
              <input
                type="number"
                value={formData.percentile}
                onChange={(e) => handleChange('percentile', e.target.value)}
                onFocus={() => setFocusedField('percentile')}
                onBlur={() => setFocusedField(null)}
                placeholder="e.g., 95.5"
                className="w-full px-5 py-4 bg-white/10 border-2 border-white/20 rounded-xl text-white placeholder-blue-300/50 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400 transition-all text-lg"
                required
                min="0"
                max="100"
                step="0.01"
                disabled={isLoading}
              />
            </FormField>

            {/* Year */}
            <FormField
              label="Academic Year"
              icon={<Calendar className="w-5 h-5" />}
              delay={0.4}
              isFocused={focusedField === 'year'}
              isCompleted={completedFields.has('year')}
            >
              <select
                value={formData.year}
                onChange={(e) => handleChange('year', e.target.value)}
                onFocus={() => setFocusedField('year')}
                onBlur={() => setFocusedField(null)}
                className="w-full px-5 py-4 bg-white/10 border-2 border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400 transition-all appearance-none cursor-pointer text-lg"
                disabled={isLoading}
              >
                <option value="2025" className="bg-slate-900 text-white">2025</option>
                <option value="2024" className="bg-slate-900 text-white">2024</option>
              </select>
            </FormField>

            {/* CAP Round */}
            <FormField
              label="CAP Round Number"
              icon={<BookOpen className="w-5 h-5" />}
              delay={0.5}
              isFocused={focusedField === 'capRound'}
              isCompleted={completedFields.has('capRound')}
            >
              <div className="grid grid-cols-2 gap-3">
                {['I', 'II'].map((round) => (
                  <motion.button
                    key={round}
                    type="button"
                    onClick={() => handleChange('capRound', round)}
                    className={`px-5 py-4 rounded-xl font-bold text-lg transition-all border-2 ${
                      formData.capRound === round
                        ? 'bg-gradient-to-r from-cyan-600 to-blue-600 border-cyan-400 text-white shadow-lg shadow-cyan-500/30'
                        : 'bg-white/10 border-white/20 text-blue-200 hover:bg-white/20'
                    }`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    disabled={isLoading}
                  >
                    Round {round}
                  </motion.button>
                ))}
              </div>
            </FormField>

            {/* Category */}
            <FormField
              label="Category"
              icon={<Users className="w-5 h-5" />}
              delay={0.6}
              isFocused={focusedField === 'category'}
              isCompleted={completedFields.has('category')}
            >
              <select
                value={formData.category}
                onChange={(e) => handleChange('category', e.target.value)}
                onFocus={() => setFocusedField('category')}
                onBlur={() => setFocusedField(null)}
                className="w-full px-5 py-4 bg-white/10 border-2 border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400 transition-all appearance-none cursor-pointer text-lg"
                disabled={isLoading}
              >
                <option value="Open" className="bg-slate-900 text-white">Open</option>
                <option value="SC" className="bg-slate-900 text-white">SC</option>
                <option value="ST" className="bg-slate-900 text-white">ST</option>
                <option value="OBC" className="bg-slate-900 text-white">OBC</option>
                <option value="NT" className="bg-slate-900 text-white">NT</option>
              </select>
            </FormField>

            {/* Branch Preference */}
            <FormField
              label="Branch Preference"
              icon={<BookOpen className="w-5 h-5" />}
              delay={0.7}
              fullWidth
              isFocused={focusedField === 'branchPreference'}
              isCompleted={completedFields.has('branchPreference')}
            >
              <select
                value={formData.branchPreference}
                onChange={(e) => handleChange('branchPreference', e.target.value)}
                onFocus={() => setFocusedField('branchPreference')}
                onBlur={() => setFocusedField(null)}
                className="w-full px-5 py-4 bg-white/10 border-2 border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400 transition-all appearance-none cursor-pointer text-lg"
                required
                disabled={isLoading}
              >
                <option value="" className="bg-slate-900 text-white">Select your preferred branch</option>
                {engineeringBranches.map(branch => (
                  <option key={branch} value={branch} className="bg-slate-900 text-white">
                    {branch}
                  </option>
                ))}
              </select>
            </FormField>

            {/* Location */}
            <FormField
              label="Preferred Location"
              icon={<MapPin className="w-5 h-5" />}
              delay={0.8}
              fullWidth
              isFocused={focusedField === 'location'}
              isCompleted={completedFields.has('location')}
            >
              <select
                value={formData.location}
                onChange={(e) => handleChange('location', e.target.value)}
                onFocus={() => setFocusedField('location')}
                onBlur={() => setFocusedField(null)}
                className="w-full px-5 py-4 bg-white/10 border-2 border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400 transition-all appearance-none cursor-pointer text-lg"
                required
                disabled={isLoading}
              >
                <option value="" className="bg-slate-900 text-white">Select your preferred location</option>
                {maharashtraDistricts.map(district => (
                  <option key={district} value={district} className="bg-slate-900 text-white">
                    {district}
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          {/* Submit Button */}
          <motion.button
            type="submit"
            className="w-full mt-10 py-5 bg-gradient-to-r from-cyan-600 via-blue-600 to-cyan-600 bg-size-200 bg-pos-0 hover:bg-pos-100 text-white font-black text-xl rounded-2xl shadow-2xl shadow-cyan-500/40 hover:shadow-3xl hover:shadow-cyan-500/50 transition-all duration-500 relative overflow-hidden group"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={isLoading}
          >
            <span className="relative z-10 flex items-center justify-center gap-3">
              <Sparkles className="w-6 h-6" />
              {isLoading ? 'Finding Your Perfect Colleges...' : 'Find My Perfect Colleges'}
              <Sparkles className="w-6 h-6" />
            </span>
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
              initial={{ x: '-100%' }}
              animate={{ x: '200%' }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
            />
          </motion.button>
        </motion.form>
      </div>
    </div>
  );
}

interface FormFieldProps {
  label: string;
  icon: React.ReactNode;
  delay: number;
  children: React.ReactNode;
  fullWidth?: boolean;
  isFocused?: boolean;
  isCompleted?: boolean;
}

function FormField({ label, icon, delay, children, fullWidth, isFocused, isCompleted }: FormFieldProps) {
  return (
    <motion.div
      className={fullWidth ? 'md:col-span-2' : ''}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.4 }}
    >
      <label className="block">
        <div className="flex items-center justify-between mb-3">
          <div className={`flex items-center gap-3 font-semibold transition-colors ${
            isFocused ? 'text-cyan-300' : 'text-blue-100'
          }`}>
            {icon}
            <span className="text-lg">{label}</span>
          </div>
          <AnimatePresence>
            {isCompleted && (
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 180 }}
              >
                <CheckCircle2 className="w-5 h-5 text-green-400" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {children}
      </label>
    </motion.div>
  );
}