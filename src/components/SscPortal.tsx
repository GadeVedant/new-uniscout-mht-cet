import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, GraduationCap, MapPin, BookOpen, Calendar, Users, Award, Info, CheckCircle2, Sparkles } from 'lucide-react';
import { SscFormData } from '../App';

interface SscPortalProps {
  onSubmit: (data: SscFormData) => void;
  onBack: () => void;
}

const maharashtraDistricts = [
  'Mumbai', 'Pune', 'Nagpur', 'Thane', 'Nashik', 'Aurangabad', 
  'Solapur', 'Kolhapur', 'Amravati', 'Navi Mumbai', 'Sangli', 
  'Jalgaon', 'Akola', 'Latur', 'Ahmednagar', 'Dhule', 'Nanded'
];

export function SscPortal({ onSubmit, onBack }: SscPortalProps) {
  const [formData, setFormData] = useState<SscFormData>({
    totalMarks: '',
    year: '2025',
    regularRound: '1',
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

  const handleChange = (field: keyof SscFormData, value: string) => {
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
            className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-purple-200 hover:text-purple-100 transition-all backdrop-blur-sm"
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
            <span className="text-purple-200 text-sm font-medium">Progress</span>
            <div className="w-32 h-2 bg-white/20 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-pink-400 to-purple-500"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <span className="text-pink-300 font-bold text-sm">{Math.round(progress)}%</span>
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
              <Sparkles className="w-12 h-12 text-pink-400" />
            </motion.div>
            <h1 className="text-6xl font-black bg-gradient-to-r from-purple-400 via-pink-400 to-purple-500 bg-clip-text text-transparent">
              10th SSC Portal
            </h1>
            <motion.div
              animate={{ rotate: [0, -360] }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            >
              <Sparkles className="w-12 h-12 text-purple-400" />
            </motion.div>
          </div>
          <p className="text-purple-100 text-xl">Discover the best junior colleges for your future</p>
          <motion.div
            className="mt-6 inline-flex items-center gap-2 px-5 py-2 bg-pink-500/20 border border-pink-400/30 rounded-full text-pink-300 text-sm"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Info className="w-4 h-4" />
            <span>Fill in your details to get personalized recommendations</span>
          </motion.div>
        </motion.div>

        {/* Form */}
        <motion.form
          onSubmit={handleSubmit}
          className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-2xl border border-white/20 rounded-3xl p-10 shadow-2xl"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          <div className="grid md:grid-cols-2 gap-8">
            {/* Total Marks */}
            <FormField
              label="Total Marks (Out of 500)"
              icon={<Award className="w-5 h-5" />}
              delay={0.3}
              isFocused={focusedField === 'totalMarks'}
              isCompleted={completedFields.has('totalMarks')}
            >
              <input
                type="number"
                value={formData.totalMarks}
                onChange={(e) => handleChange('totalMarks', e.target.value)}
                onFocus={() => setFocusedField('totalMarks')}
                onBlur={() => setFocusedField(null)}
                placeholder="e.g., 450"
                className="w-full px-5 py-4 bg-white/10 border-2 border-white/20 rounded-xl text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 focus:ring-pink-400/50 focus:border-pink-400 transition-all text-lg"
                required
                min="0"
                max="500"
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
                className="w-full px-5 py-4 bg-white/10 border-2 border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-pink-400/50 focus:border-pink-400 transition-all appearance-none cursor-pointer text-lg"
              >
                <option value="2025" className="bg-slate-900 text-white">2025</option>
                <option value="2024" className="bg-slate-900 text-white">2024</option>
              </select>
            </FormField>

            {/* Regular Round */}
            <FormField
              label="Regular Round Number"
              icon={<BookOpen className="w-5 h-5" />}
              delay={0.5}
              isFocused={focusedField === 'regularRound'}
              isCompleted={completedFields.has('regularRound')}
            >
              <div className="grid grid-cols-3 gap-3">
                {['1', '2', '3'].map((round) => (
                  <motion.button
                    key={round}
                    type="button"
                    onClick={() => handleChange('regularRound', round)}
                    className={`px-5 py-4 rounded-xl font-bold text-lg transition-all border-2 ${
                      formData.regularRound === round
                        ? 'bg-gradient-to-r from-pink-600 to-purple-600 border-pink-400 text-white shadow-lg shadow-pink-500/30'
                        : 'bg-white/10 border-white/20 text-purple-200 hover:bg-white/20'
                    }`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
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
                className="w-full px-5 py-4 bg-white/10 border-2 border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-pink-400/50 focus:border-pink-400 transition-all appearance-none cursor-pointer text-lg"
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
              label="Stream Preference"
              icon={<BookOpen className="w-5 h-5" />}
              delay={0.7}
              fullWidth
              isFocused={focusedField === 'branchPreference'}
              isCompleted={completedFields.has('branchPreference')}
            >
              <div className="grid grid-cols-3 gap-4">
                {['Science', 'Commerce', 'Arts'].map((stream) => (
                  <motion.button
                    key={stream}
                    type="button"
                    onClick={() => handleChange('branchPreference', stream)}
                    className={`px-6 py-5 rounded-xl font-bold text-lg transition-all border-2 ${
                      formData.branchPreference === stream
                        ? 'bg-gradient-to-r from-pink-600 to-purple-600 border-pink-400 text-white shadow-lg shadow-pink-500/30'
                        : 'bg-white/10 border-white/20 text-purple-200 hover:bg-white/20'
                    }`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {stream}
                  </motion.button>
                ))}
              </div>
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
                className="w-full px-5 py-4 bg-white/10 border-2 border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-pink-400/50 focus:border-pink-400 transition-all appearance-none cursor-pointer text-lg"
                required
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
            className="w-full mt-10 py-5 bg-gradient-to-r from-pink-600 via-purple-600 to-pink-600 bg-size-200 bg-pos-0 hover:bg-pos-100 text-white font-black text-xl rounded-2xl shadow-2xl shadow-pink-500/40 hover:shadow-3xl hover:shadow-pink-500/50 transition-all duration-500 relative overflow-hidden group"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="relative z-10 flex items-center justify-center gap-3">
              <Sparkles className="w-6 h-6" />
              Find My Perfect Colleges
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
            isFocused ? 'text-pink-300' : 'text-purple-100'
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