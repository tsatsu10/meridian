import { useState } from "react";
import { Book, Award, Trophy, Star } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useSecurityCourses } from "@/hooks/use-security-courses";

interface SecurityEducationProps {
  userId: string;
}

export function SecurityEducation({ userId }: SecurityEducationProps) {
  const { courses, progress, achievements } = useSecurityCourses(userId);
  const [selectedCourse, setSelectedCourse] = useState(null);

  return (
    <div className="space-y-8 bg-white dark:bg-gray-900 p-6 rounded-lg">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Security Education</h2>
        <div className="flex items-center space-x-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          <span className="font-semibold">{achievements.points} Points</span>
        </div>
      </div>

      {/* Progress Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
          <div className="flex items-center space-x-3 mb-4">
            <Book className="h-6 w-6 text-blue-600" />
            <h3 className="text-lg font-semibold">Courses Completed</h3>
          </div>
          <div className="text-3xl font-bold">
            {progress.completed}/{courses.length}
          </div>
        </div>

        <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
          <div className="flex items-center space-x-3 mb-4">
            <Award className="h-6 w-6 text-purple-600" />
            <h3 className="text-lg font-semibold">Achievements</h3>
          </div>
          <div className="text-3xl font-bold">
            {achievements.badges.length}
          </div>
        </div>

        <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
          <div className="flex items-center space-x-3 mb-4">
            <Star className="h-6 w-6 text-yellow-500" />
            <h3 className="text-lg font-semibold">Security Level</h3>
          </div>
          <div className="text-3xl font-bold">
            {achievements.level}
          </div>
        </div>
      </div>

      {/* Course List */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold">Available Courses</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {courses.map((course) => (
            <div
              key={course.id}
              className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedCourse(course)}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-lg font-semibold">{course.title}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                    {course.description}
                  </p>
                </div>
                {course.completed && (
                  <Award className="h-5 w-5 text-green-500" />
                )}
              </div>
              <div className="mt-4">
                <Progress value={course.progress} max={100} />
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                  {course.progress}% Complete
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Achievements */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold">Your Achievements</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {achievements.badges.map((badge) => (
            <div
              key={badge.id}
              className="p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm text-center"
            >
              <div className="w-16 h-16 mx-auto mb-3 relative">
                {badge.icon}
              </div>
              <h4 className="font-semibold">{badge.name}</h4>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {badge.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}