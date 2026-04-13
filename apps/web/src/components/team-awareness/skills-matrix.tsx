/**
 * Skills Matrix Component
 * Team skills and expertise management
 * Phase 2 - Team Awareness Features
 */

import React, { useState, useEffect } from 'react';

type ProficiencyLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';
type SkillCategory = 'frontend' | 'backend' | 'design' | 'management' | 'devops' | 'data' | 'mobile' | 'other';

interface Skill {
  id: string;
  userId: string;
  skillName: string;
  skillCategory?: SkillCategory;
  proficiencyLevel: ProficiencyLevel;
  proficiencyScore: number;
  yearsOfExperience?: number;
  isVerified: boolean;
  endorsementCount: number;
  user: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
}

interface SkillsMatrixProps {
  workspaceId: string;
  currentUserId?: string;
  className?: string;
}

export const SkillsMatrix: React.FC<SkillsMatrixProps> = ({
  workspaceId,
  currentUserId,
  className = '',
}) => {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [matrix, setMatrix] = useState<Record<string, Skill[]>>({});
  const [popularSkills, setPopularSkills] = useState<any[]>([]);
  const [showAddSkill, setShowAddSkill] = useState(false);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'matrix' | 'user'>('matrix');

  // Add skill form state
  const [skillName, setSkillName] = useState('');
  const [skillCategory, setSkillCategory] = useState<SkillCategory>('other');
  const [proficiencyLevel, setProficiencyLevel] = useState<ProficiencyLevel>('intermediate');
  const [yearsOfExperience, setYearsOfExperience] = useState<number>(1);

  useEffect(() => {
    fetchSkillsData();
  }, [workspaceId, view]);

  const fetchSkillsData = async () => {
    try {
      setLoading(true);
      
      if (view === 'matrix') {
        // Fetch matrix and popular skills
        const [matrixRes, popularRes] = await Promise.all([
          fetch(`/api/team-awareness/skills/matrix?workspaceId=${workspaceId}`),
          fetch(`/api/team-awareness/skills/popular?workspaceId=${workspaceId}&limit=10`),
        ]);

        const [matrixData, popularData] = await Promise.all([
          matrixRes.json(),
          popularRes.json(),
        ]);

        setMatrix(matrixData.matrix || {});
        setPopularSkills(popularData.popularSkills || []);
      } else if (currentUserId) {
        // Fetch user skills
        const response = await fetch(
          `/api/team-awareness/skills/user/${currentUserId}?workspaceId=${workspaceId}`
        );
        const data = await response.json();
        setSkills(data.skills || []);
      }
    } catch (err) {
      console.error('Failed to fetch skills:', err);
    } finally {
      setLoading(false);
    }
  };

  const addSkill = async () => {
    if (!currentUserId || !skillName.trim()) return;

    const proficiencyScores: Record<ProficiencyLevel, number> = {
      beginner: 1,
      intermediate: 2,
      advanced: 4,
      expert: 5,
    };

    try {
      const response = await fetch('/api/team-awareness/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUserId,
          workspaceId,
          skillName: skillName.trim(),
          skillCategory,
          proficiencyLevel,
          proficiencyScore: proficiencyScores[proficiencyLevel],
          yearsOfExperience,
          isPublic: true,
        }),
      });

      if (response.ok) {
        await fetchSkillsData();
        setSkillName('');
        setShowAddSkill(false);
      }
    } catch (err) {
      console.error('Failed to add skill:', err);
    }
  };

  const endorseSkill = async (skillId: string) => {
    if (!currentUserId) return;

    try {
      const response = await fetch(`/api/team-awareness/skills/${skillId}/endorse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endorserId: currentUserId,
        }),
      });

      if (response.ok) {
        await fetchSkillsData();
      }
    } catch (err) {
      console.error('Failed to endorse skill:', err);
    }
  };

  const getProficiencyColor = (level: ProficiencyLevel) => {
    const colors: Record<ProficiencyLevel, string> = {
      beginner: 'bg-gray-200 text-gray-700',
      intermediate: 'bg-blue-200 text-blue-700',
      advanced: 'bg-purple-200 text-purple-700',
      expert: 'bg-yellow-200 text-yellow-700',
    };
    return colors[level];
  };

  const getProficiencyIcon = (score: number) => {
    if (score >= 5) return '⭐⭐⭐⭐⭐';
    if (score >= 4) return '⭐⭐⭐⭐';
    if (score >= 3) return '⭐⭐⭐';
    if (score >= 2) return '⭐⭐';
    return '⭐';
  };

  const getCategoryIcon = (category?: SkillCategory) => {
    const icons: Record<SkillCategory, string> = {
      frontend: '🎨',
      backend: '⚙️',
      design: '✨',
      management: '📊',
      devops: '🚀',
      data: '📈',
      mobile: '📱',
      other: '🔧',
    };
    return icons[category || 'other'];
  };

  if (loading) {
    return (
      <div className={`animate-pulse space-y-4 ${className}`}>
        <div className="h-32 bg-gray-100 rounded-lg" />
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex space-x-2">
          <button
            onClick={() => setView('matrix')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              view === 'matrix'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Team Matrix
          </button>
          {currentUserId && (
            <button
              onClick={() => setView('user')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                view === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              My Skills
            </button>
          )}
        </div>

        {currentUserId && view === 'user' && (
          <button
            onClick={() => setShowAddSkill(!showAddSkill)}
            className="px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
          >
            + Add Skill
          </button>
        )}
      </div>

      {/* Add Skill Form */}
      {showAddSkill && currentUserId && (
        <div className="mb-6 p-4 bg-white border border-gray-200 rounded-lg space-y-4">
          <h3 className="font-semibold text-gray-900">Add a New Skill</h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Skill Name</label>
            <input
              type="text"
              value={skillName}
              onChange={(e) => setSkillName(e.target.value)}
              placeholder="e.g., React, Python, UI Design..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select
                value={skillCategory}
                onChange={(e) => setSkillCategory(e.target.value as SkillCategory)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="frontend">Frontend</option>
                <option value="backend">Backend</option>
                <option value="design">Design</option>
                <option value="management">Management</option>
                <option value="devops">DevOps</option>
                <option value="data">Data</option>
                <option value="mobile">Mobile</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Proficiency</label>
              <select
                value={proficiencyLevel}
                onChange={(e) => setProficiencyLevel(e.target.value as ProficiencyLevel)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
                <option value="expert">Expert</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Years of Experience
            </label>
            <input
              type="number"
              min="0"
              max="50"
              value={yearsOfExperience}
              onChange={(e) => setYearsOfExperience(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex space-x-2">
            <button
              onClick={addSkill}
              disabled={!skillName.trim()}
              className="flex-1 py-2 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Add Skill
            </button>
            <button
              onClick={() => setShowAddSkill(false)}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Team Matrix View */}
      {view === 'matrix' && (
        <>
          {/* Popular Skills */}
          {popularSkills.length > 0 && (
            <div className="mb-6 p-4 bg-white border border-gray-200 rounded-lg">
              <h3 className="text-sm font-medium text-gray-700 mb-4">Most Popular Skills</h3>
              <div className="flex flex-wrap gap-2">
                {popularSkills.map((skill) => (
                  <div
                    key={skill.skillName}
                    className="px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium"
                  >
                    {skill.skillName} ({skill.count} {skill.count === 1 ? 'person' : 'people'})
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Skills Matrix */}
          <div className="space-y-4">
            {Object.keys(matrix).length === 0 ? (
              <div className="p-8 text-center bg-gray-50 rounded-lg">
                <p className="text-gray-500">No skills added yet. Be the first!</p>
              </div>
            ) : (
              Object.entries(matrix).map(([skillName, skillUsers]) => (
                <div key={skillName} className="p-4 bg-white border border-gray-200 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-3">{skillName}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {skillUsers.map((skill) => (
                      <div
                        key={skill.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          {skill.user.avatarUrl ? (
                            <img
                              src={skill.user.avatarUrl}
                              alt={skill.user.username}
                              className="w-8 h-8 rounded-full"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium">
                              {skill.user.username[0].toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-medium text-gray-900">{skill.user.username}</p>
                            <div className="flex items-center space-x-2">
                              <span
                                className={`px-2 py-0.5 text-xs rounded ${getProficiencyColor(
                                  skill.proficiencyLevel
                                )}`}
                              >
                                {skill.proficiencyLevel}
                              </span>
                              {skill.isVerified && <span className="text-xs">✓ Verified</span>}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <span className="text-xs">{getProficiencyIcon(skill.proficiencyScore)}</span>
                          {currentUserId && currentUserId !== skill.userId && (
                            <button
                              onClick={() => endorseSkill(skill.id)}
                              className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                            >
                              👍 {skill.endorsementCount}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* User Skills View */}
      {view === 'user' && currentUserId && (
        <div className="space-y-3">
          {skills.length === 0 ? (
            <div className="p-8 text-center bg-gray-50 rounded-lg">
              <p className="text-gray-500 mb-4">You haven't added any skills yet.</p>
              <button
                onClick={() => setShowAddSkill(true)}
                className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add Your First Skill
              </button>
            </div>
          ) : (
            skills.map((skill) => (
              <div
                key={skill.id}
                className="p-4 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{getCategoryIcon(skill.skillCategory)}</span>
                    <div>
                      <h4 className="font-semibold text-gray-900">{skill.skillName}</h4>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className={`px-2 py-0.5 text-xs rounded ${getProficiencyColor(skill.proficiencyLevel)}`}>
                          {skill.proficiencyLevel}
                        </span>
                        {skill.yearsOfExperience && (
                          <span className="text-xs text-gray-500">{skill.yearsOfExperience} years</span>
                        )}
                        {skill.isVerified && (
                          <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded">
                            ✓ Verified
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="text-center">
                      <p className="text-xs text-gray-500">Endorsements</p>
                      <p className="text-lg font-bold text-gray-900">{skill.endorsementCount}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Proficiency</p>
                      <p className="text-sm">{getProficiencyIcon(skill.proficiencyScore)}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default SkillsMatrix;

