import React, { useState } from 'react';
import { TrendingUp, Plus, Target, Calendar, Weight, CheckCircle, Award, Star, Edit2, Trash2 } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';

export default function ProgressTracking() {
  const {
    weightEntries,
    addWeightEntry,
    updateWeightEntry,
    deleteWeightEntry,
    weeklyGoals,
    getCurrentWeekProgress,
    updateWeeklyProgress,
    updateWeeklyGoal,
    getUserBadges
  } = useData();
  const { user } = useAuth();
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [showEditEntry, setShowEditEntry] = useState(false);
  const [editingEntry, setEditingEntry] = useState<any>(null);
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
  const [newEntry, setNewEntry] = useState({
    weight: '',
    date: new Date().toISOString().split('T')[0],
    measurements: {
      waist: '',
      chest: '',
      hips: ''
    }
  });

  const userEntries = weightEntries
    .filter(entry => entry.userId === user?.id)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); // Tri par date croissante pour le graphique

  const currentWeekProgress = user ? getCurrentWeekProgress(user.id) : null;
  const userBadges = user ? getUserBadges(user.id) : [];

  const handleAddEntry = () => {
    if (!newEntry.weight || !user) return;

    addWeightEntry({
      userId: user.id,
      weight: parseFloat(newEntry.weight),
      date: newEntry.date,
      measurements: {
        waist: newEntry.measurements.waist ? parseFloat(newEntry.measurements.waist) : undefined,
        chest: newEntry.measurements.chest ? parseFloat(newEntry.measurements.chest) : undefined,
        hips: newEntry.measurements.hips ? parseFloat(newEntry.measurements.hips) : undefined
      }
    });

    setNewEntry({
      weight: '',
      date: new Date().toISOString().split('T')[0],
      measurements: { waist: '', chest: '', hips: '' }
    });
    setShowAddEntry(false);
  };

  const handleEditEntry = () => {
    if (!editingEntry || !editingEntry.weight || !user) return;

    updateWeightEntry(editingEntry.id, {
      weight: parseFloat(editingEntry.weight),
      date: editingEntry.date,
      measurements: {
        waist: editingEntry.measurements?.waist ? parseFloat(editingEntry.measurements.waist) : undefined,
        chest: editingEntry.measurements?.chest ? parseFloat(editingEntry.measurements.chest) : undefined,
        hips: editingEntry.measurements?.hips ? parseFloat(editingEntry.measurements.hips) : undefined
      }
    });

    setEditingEntry(null);
    setShowEditEntry(false);
  };

  const handleDeleteEntry = (entryId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette entrée ?')) {
      deleteWeightEntry(entryId);
    }
  };

  const openEditModal = (entry: any) => {
    setEditingEntry({
      ...entry,
      weight: entry.weight.toString(),
      measurements: {
        waist: entry.measurements?.waist?.toString() || '',
        chest: entry.measurements?.chest?.toString() || '',
        hips: entry.measurements?.hips?.toString() || ''
      }
    });
    setShowEditEntry(true);
  };

  const calculateIMC = (weight: number, heightCm?: number) => {
    // Utiliser la taille du profil si disponible, sinon 1.70m par défaut
    const height = heightCm ? heightCm / 100 : 1.70;
    return (weight / (height * height)).toFixed(1);
  };

  const getIMCCategory = (imc: number) => {
    if (imc < 18.5) return { text: 'Insuffisance pondérale', color: 'text-blue-600' };
    if (imc < 25) return { text: 'Poids normal', color: 'text-green-600' };
    if (imc < 30) return { text: 'Surpoids', color: 'text-yellow-600' };
    return { text: 'Obésité', color: 'text-red-600' };
  };

  const latest = userEntries[userEntries.length - 1]; // Dernier élément après tri croissant
  const previous = userEntries[userEntries.length - 2];
  const weightChange = latest && previous ? latest.weight - previous.weight : 0;

  // Récupérer l'objectif de poids du profil utilisateur (défaut: 70kg)
  const weightGoal = user?.profile?.weightGoal || 70;
  const heightCm = user?.profile?.heightCm;

  // Fonctions pour la checklist hebdomadaire
  const handleDailyGoalToggle = (goalId: string, dayIndex: number, completed: boolean) => {
    if (user) {
      updateWeeklyProgress(user.id, goalId, dayIndex, completed);
    }
  };

  const handleWeeklyGoalToggle = (goalId: string, completed: boolean) => {
    if (user) {
      updateWeeklyGoal(user.id, goalId, completed);
    }
  };

  const getDayName = (index: number) => {
    const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
    return days[index];
  };

  const getWeeklyCompletionRate = () => {
    if (!currentWeekProgress) return 0;
    
    let totalTasks = 0;
    let completedTasks = 0;
    
    weeklyGoals.forEach(goal => {
      const goalProgress = currentWeekProgress.goals[goal.id];
      if (goal.type === 'daily') {
        totalTasks += 7;
        completedTasks += goalProgress?.completed.filter(Boolean).length || 0;
      } else {
        totalTasks += 1;
        completedTasks += goalProgress?.weeklyCompleted ? 1 : 0;
      }
    });
    
    return totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  };

  const isAllGoalsCompleted = () => {
    if (!currentWeekProgress) return false;
    
    return weeklyGoals.every(goal => {
      const goalProgress = currentWeekProgress.goals[goal.id];
      if (goal.type === 'daily') {
        return goalProgress?.completed.every(Boolean) || false;
      } else {
        return goalProgress?.weeklyCompleted || false;
      }
    });
  };

  // Fonction pour créer le graphique SVG avec toutes les mesures
  const createWeightChart = () => {
    if (userEntries.length === 0) return null;

    const chartWidth = 800;
    const chartHeight = 300;
    const padding = 60;
    const innerWidth = chartWidth - 2 * padding;
    const innerHeight = chartHeight - 2 * padding;

    // Définir les lignes à afficher avec leurs configurations
    const measurements = [
      {
        key: 'weight',
        label: 'Poids',
        unit: 'kg',
        color: '#10b981',
        getValue: (entry: any) => entry.weight,
        gradientId: 'weightGradient'
      },
      {
        key: 'waist',
        label: 'Tour de taille',
        unit: 'cm',
        color: '#3b82f6',
        getValue: (entry: any) => entry.measurements?.waist,
        gradientId: 'waistGradient'
      },
      {
        key: 'chest',
        label: 'Tour de poitrine',
        unit: 'cm',
        color: '#8b5cf6',
        getValue: (entry: any) => entry.measurements?.chest,
        gradientId: 'chestGradient'
      },
      {
        key: 'hips',
        label: 'Tour de hanches',
        unit: 'cm',
        color: '#f59e0b',
        getValue: (entry: any) => entry.measurements?.hips,
        gradientId: 'hipsGradient'
      }
    ];

    // Collecter toutes les valeurs pour calculer l'échelle
    const allValues: number[] = [];
    userEntries.forEach(entry => {
      measurements.forEach(m => {
        const value = m.getValue(entry);
        if (value !== undefined && value !== null) {
          allValues.push(value);
        }
      });
    });

    if (allValues.length === 0) return null;

    const minValue = Math.min(...allValues);
    const maxValue = Math.max(...allValues);
    const valueRange = maxValue - minValue;
    const yMin = Math.max(0, minValue - valueRange * 0.1);
    const yMax = maxValue + valueRange * 0.1;

    // Créer les points pour chaque mesure
    const measurementPoints = measurements.map(measurement => {
      const points = userEntries
        .map((entry, index) => {
          const value = measurement.getValue(entry);
          if (value === undefined || value === null) return null;

          const x = padding + (index / Math.max(1, userEntries.length - 1)) * innerWidth;
          const y = padding + ((yMax - value) / (yMax - yMin)) * innerHeight;
          return { x, y, entry, index, value };
        })
        .filter(p => p !== null);

      // Créer le path pour cette mesure
      const pathData = points.reduce((path, point, index) => {
        if (index === 0) {
          return `M ${point!.x} ${point!.y}`;
        } else {
          const prevPoint = points[index - 1]!;
          const cpx1 = prevPoint.x + (point!.x - prevPoint.x) * 0.5;
          const cpy1 = prevPoint.y;
          const cpx2 = prevPoint.x + (point!.x - prevPoint.x) * 0.5;
          const cpy2 = point!.y;
          return `${path} C ${cpx1} ${cpy1}, ${cpx2} ${cpy2}, ${point!.x} ${point!.y}`;
        }
      }, '');

      return { ...measurement, points, pathData };
    }).filter(m => m.points.length > 0);

    // Créer les lignes de grille horizontales
    const gridLines = [];
    const numGridLines = 5;
    for (let i = 0; i <= numGridLines; i++) {
      const y = padding + (i / numGridLines) * innerHeight;
      const value = yMax - (i / numGridLines) * (yMax - yMin);
      gridLines.push({ y, value });
    }

    return (
      <div className="w-full overflow-x-auto">
        <svg width={chartWidth} height={chartHeight} className="min-w-full">
          {/* Définitions des gradients et filtres */}
          <defs>
            {measurementPoints.map(m => (
              <linearGradient key={m.gradientId} id={m.gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={m.color} stopOpacity="0.2" />
                <stop offset="100%" stopColor={m.color} stopOpacity="0.02" />
              </linearGradient>
            ))}
            <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000000" floodOpacity="0.1"/>
            </filter>
          </defs>

          {/* Lignes de grille */}
          {gridLines.map((line, index) => (
            <g key={index}>
              <line
                x1={padding}
                y1={line.y}
                x2={chartWidth - padding}
                y2={line.y}
                stroke="#e5e7eb"
                strokeWidth="1"
                strokeDasharray={index === 0 || index === numGridLines ? "none" : "2,2"}
              />
              <text
                x={padding - 10}
                y={line.y + 4}
                textAnchor="end"
                className="text-xs fill-gray-500"
              >
                {line.value.toFixed(0)}
              </text>
            </g>
          ))}

          {/* Zones sous les courbes (gradients) */}
          {measurementPoints.map(measurement => {
            if (measurement.points.length < 2) return null;
            const firstPoint = measurement.points[0]!;
            const lastPoint = measurement.points[measurement.points.length - 1]!;
            const areaPath = `${measurement.pathData} L ${lastPoint.x} ${padding + innerHeight} L ${firstPoint.x} ${padding + innerHeight} Z`;

            return (
              <path
                key={`area-${measurement.key}`}
                d={areaPath}
                fill={`url(#${measurement.gradientId})`}
              />
            );
          })}

          {/* Lignes de courbes */}
          {measurementPoints.map(measurement => (
            <path
              key={`line-${measurement.key}`}
              d={measurement.pathData}
              fill="none"
              stroke={measurement.color}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#shadow)"
            />
          ))}

          {/* Points sur les courbes */}
          {measurementPoints.map(measurement =>
            measurement.points.map((point, index) => (
              <g key={`${measurement.key}-point-${index}`}>
                <circle
                  cx={point!.x}
                  cy={point!.y}
                  r="5"
                  fill="#ffffff"
                  stroke={measurement.color}
                  strokeWidth="2.5"
                  filter="url(#shadow)"
                  className="cursor-pointer transition-all"
                  onMouseEnter={() => setHoveredPoint(point!.index)}
                  onMouseLeave={() => setHoveredPoint(null)}
                />

                {hoveredPoint === point!.index && (
                  <circle
                    cx={point!.x}
                    cy={point!.y}
                    r="7"
                    fill="#ffffff"
                    stroke={measurement.color}
                    strokeWidth="3"
                    filter="url(#shadow)"
                    className="pointer-events-none"
                  />
                )}
              </g>
            ))
          )}

          {/* Tooltip au survol */}
          {hoveredPoint !== null && (() => {
            const entry = userEntries[hoveredPoint];
            const firstMeasurement = measurementPoints[0];
            if (!firstMeasurement || firstMeasurement.points.length === 0) return null;

            const pointData = firstMeasurement.points.find(p => p!.index === hoveredPoint);
            if (!pointData) return null;

            const tooltipX = pointData.x;
            const tooltipY = padding + 20;
            const tooltipHeight = 80 + (measurementPoints.length * 20);

            return (
              <g className="pointer-events-none">
                <line
                  x1={tooltipX}
                  y1={padding}
                  x2={tooltipX}
                  y2={chartHeight - padding}
                  stroke="#6b7280"
                  strokeWidth="1"
                  strokeDasharray="3,3"
                  opacity="0.5"
                />

                <rect
                  x={tooltipX - 80}
                  y={tooltipY}
                  width="160"
                  height={tooltipHeight}
                  rx="8"
                  fill="#ffffff"
                  stroke="#d1d5db"
                  strokeWidth="1"
                  filter="url(#shadow)"
                />

                <text
                  x={tooltipX}
                  y={tooltipY + 20}
                  textAnchor="middle"
                  className="text-sm font-semibold fill-gray-700"
                >
                  {new Date(entry.date).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })}
                </text>

                {measurementPoints.map((m, idx) => {
                  const value = m.getValue(entry);
                  if (value === undefined || value === null) return null;

                  return (
                    <g key={`tooltip-${m.key}`}>
                      <circle
                        cx={tooltipX - 65}
                        cy={tooltipY + 40 + (idx * 20)}
                        r="4"
                        fill={m.color}
                      />
                      <text
                        x={tooltipX - 55}
                        y={tooltipY + 44 + (idx * 20)}
                        className="text-xs fill-gray-600"
                      >
                        {m.label}:
                      </text>
                      <text
                        x={tooltipX + 60}
                        y={tooltipY + 44 + (idx * 20)}
                        textAnchor="end"
                        className="text-xs font-semibold fill-gray-800"
                      >
                        {value} {m.unit}
                      </text>
                    </g>
                  );
                })}
              </g>
            );
          })()}

          {/* Zone invisible pour capturer les événements de souris sur toute la courbe */}
          <rect
            x={padding}
            y={padding}
            width={innerWidth}
            height={innerHeight}
            fill="transparent"
            className="cursor-crosshair"
            onMouseMove={(e) => {
              const rect = e.currentTarget.ownerSVGElement?.getBoundingClientRect();
              if (rect) {
                const mouseX = e.clientX - rect.left;
                if (measurementPoints.length > 0 && measurementPoints[0].points.length > 0) {
                  const firstMeasurementPoints = measurementPoints[0].points;
                  let closestIndex = firstMeasurementPoints[0]!.index;
                  let closestDistance = Math.abs(firstMeasurementPoints[0]!.x - mouseX);

                  firstMeasurementPoints.forEach(point => {
                    const distance = Math.abs(point!.x - mouseX);
                    if (distance < closestDistance) {
                      closestDistance = distance;
                      closestIndex = point!.index;
                    }
                  });

                  if (closestDistance < 50) {
                    setHoveredPoint(closestIndex);
                  } else {
                    setHoveredPoint(null);
                  }
                }
              }
            }}
            onMouseLeave={() => setHoveredPoint(null)}
          />

          {/* Axe X avec dates */}
          {userEntries.map((entry, index) => {
            const shouldShowLabel = userEntries.length <= 7 || index % Math.ceil(userEntries.length / 6) === 0 || index === userEntries.length - 1;
            if (!shouldShowLabel) return null;

            const x = padding + (index / Math.max(1, userEntries.length - 1)) * innerWidth;

            return (
              <text
                key={`date-${index}`}
                x={x}
                y={chartHeight - padding + 20}
                textAnchor="middle"
                className="text-xs fill-gray-500"
              >
                {new Date(entry.date).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'short'
                })}
              </text>
            );
          })}

          {/* Ligne d'objectif */}
          {(() => {
            const targetWeight = weightGoal;
            if (targetWeight >= yMin && targetWeight <= yMax) {
              const targetY = padding + ((yMax - targetWeight) / (yMax - yMin)) * innerHeight;
              return (
                <g>
                  <line
                    x1={padding}
                    y1={targetY}
                    x2={chartWidth - padding}
                    y2={targetY}
                    stroke="#ef4444"
                    strokeWidth="2"
                    strokeDasharray="5,5"
                  />
                  <text
                    x={chartWidth - padding - 5}
                    y={targetY - 5}
                    textAnchor="end"
                    className="text-xs fill-red-500 font-medium"
                  >
                    Objectif: {targetWeight}kg
                  </text>
                </g>
              );
            }
            return null;
          })()}
        </svg>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Suivi des progrès</h1>
          <p className="text-gray-600 mt-2">{userEntries.length} entrées enregistrées</p>
        </div>
        <button
          onClick={() => setShowAddEntry(true)}
          className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors mt-4 md:mt-0"
        >
          <Plus className="w-4 h-4" />
          <span>Nouvelle entrée</span>
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Poids actuel</p>
              <p className="text-xl md:text-2xl font-bold text-gray-800">
                {latest ? `${latest.weight} kg` : 'Non renseigné'}
              </p>
            </div>
            <div className="w-10 h-10 md:w-12 md:h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Weight className="w-5 h-5 md:w-6 md:h-6 text-green-600" />
            </div>
          </div>
          {weightChange !== 0 && (
            <div className={`flex items-center space-x-1 mt-2 ${weightChange > 0 ? 'text-red-600' : 'text-green-600'}`}>
              <TrendingUp className={`w-3 h-3 md:w-4 md:h-4 ${weightChange < 0 ? 'rotate-180 scale-x-[-1]' : ''}`} />
              <span className="text-xs md:text-sm font-medium">
                {weightChange > 0 ? '+' : ''}{weightChange.toFixed(1)} kg
              </span>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">IMC</p>
              <p className="text-xl md:text-2xl font-bold text-gray-800">
                {latest ? calculateIMC(latest.weight, heightCm) : 'N/A'}
              </p>
            </div>
            <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Target className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
            </div>
          </div>
          {latest && (
            <p className={`text-xs md:text-sm font-medium mt-2 ${getIMCCategory(parseFloat(calculateIMC(latest.weight, heightCm))).color}`}>
              {getIMCCategory(parseFloat(calculateIMC(latest.weight, heightCm))).text}
            </p>
          )}
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Objectif</p>
              <p className="text-xl md:text-2xl font-bold text-gray-800">{weightGoal} kg</p>
            </div>
            <div className="w-10 h-10 md:w-12 md:h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Target className="w-5 h-5 md:w-6 md:h-6 text-purple-600" />
            </div>
          </div>
          <p className="text-xs md:text-sm text-gray-500 mt-2">À atteindre</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Dernière entrée</p>
              <p className="text-xl md:text-2xl font-bold text-gray-800">
                {latest ? new Date(latest.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : 'Aucune'}
              </p>
            </div>
            <div className="w-10 h-10 md:w-12 md:h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 md:w-6 md:h-6 text-orange-600" />
            </div>
          </div>
          <p className="text-xs md:text-sm text-gray-500 mt-2">
            {latest ? `Il y a ${Math.floor((Date.now() - new Date(latest.date).getTime()) / (1000 * 60 * 60 * 24))} jours` : 'Aucune donnée'}
          </p>
        </div>
      </div>

      {/* Weight Chart */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="flex flex-col space-y-4 mb-6">
          <h2 className="text-xl font-semibold text-gray-800">Évolution des mesures</h2>
          {userEntries.length > 1 && (
            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span>Poids</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span>Tour de taille</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                <span>Tour de poitrine</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                <span>Tour de hanches</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-1 bg-red-500 border-dashed border border-red-500"></div>
                <span>Objectif ({weightGoal}kg)</span>
              </div>
            </div>
          )}
        </div>
        
        {userEntries.length > 0 ? (
          <div className="bg-gray-50 rounded-lg p-4">
            {createWeightChart()}
          </div>
        ) : (
          <div className="text-center py-12">
            <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Aucune donnée à afficher</p>
            <p className="text-sm text-gray-400 mt-1">Ajoutez votre première entrée de poids pour voir le graphique</p>
          </div>
        )}
      </div>

      {/* Checklist Hebdomadaire */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                <CheckCircle className="w-6 h-6 text-purple-600 mr-3" />
                Objectifs de la semaine
              </h2>
              <p className="text-gray-600 mt-1">Suivez vos habitudes quotidiennes et hebdomadaires</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-purple-600">{getWeeklyCompletionRate()}%</div>
              <div className="text-sm text-gray-600">Complété</div>
            </div>
          </div>
          
          {/* Barre de progression */}
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-purple-500 to-blue-500 h-3 rounded-full transition-all duration-500"
                style={{ width: `${getWeeklyCompletionRate()}%` }}
              />
            </div>
          </div>
        </div>

        <div className="p-4 md:p-6">
          <div className="space-y-4 md:space-y-6">
            {weeklyGoals.map((goal) => {
              const goalProgress = currentWeekProgress?.goals[goal.id];
              
              return (
                <div key={goal.id} className="border border-gray-200 rounded-lg p-3 md:p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <span className="text-xl md:text-2xl">{goal.icon}</span>
                      <div>
                        <h3 className="font-semibold text-gray-800 text-sm md:text-base">{goal.title}</h3>
                        <p className="text-xs md:text-sm text-gray-600">{goal.description}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${goal.color}`}>
                      {goal.type === 'daily' ? 'Quotidien' : 'Hebdomadaire'}
                    </span>
                  </div>

                  {goal.type === 'daily' ? (
                    <>
                      {/* Version Desktop - Grille horizontale */}
                      <div className="hidden md:grid grid-cols-7 gap-2">
                        {Array.from({ length: 7 }, (_, index) => {
                          const isCompleted = goalProgress?.completed[index] || false;
                          return (
                            <button
                              key={index}
                              onClick={() => handleDailyGoalToggle(goal.id, index, !isCompleted)}
                              className={`p-3 rounded-lg border-2 transition-all text-center ${
                                isCompleted
                                  ? 'border-green-500 bg-green-50 text-green-700'
                                  : 'border-gray-200 hover:border-gray-300 text-gray-600'
                              }`}
                            >
                              <div className="text-xs font-medium mb-1">{getDayName(index)}</div>
                              <div className={`w-6 h-6 mx-auto rounded-full border-2 flex items-center justify-center ${
                                isCompleted
                                  ? 'border-green-500 bg-green-500'
                                  : 'border-gray-300'
                              }`}>
                                {isCompleted && <CheckCircle className="w-4 h-4 text-white" />}
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {/* Version Mobile - Grille 2x4 (2 colonnes, jusqu'à 4 lignes) */}
                      <div className="md:hidden grid grid-cols-2 gap-2">
                        {Array.from({ length: 7 }, (_, index) => {
                          const isCompleted = goalProgress?.completed[index] || false;
                          return (
                            <button
                              key={index}
                              onClick={() => handleDailyGoalToggle(goal.id, index, !isCompleted)}
                              className={`flex items-center justify-center p-3 rounded-lg border-2 transition-all text-center ${
                                isCompleted
                                  ? 'border-green-500 bg-green-50 text-green-700'
                                  : 'border-gray-200 hover:border-gray-300 text-gray-600'
                              } ${index === 6 ? 'col-span-2' : ''}`}
                            >
                              <div className="flex flex-col items-center space-y-2">
                                <div className="text-sm font-medium">{getDayName(index)}</div>
                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                                  isCompleted
                                    ? 'border-green-500 bg-green-500'
                                    : 'border-gray-300'
                                }`}>
                                  {isCompleted && <CheckCircle className="w-4 h-4 text-white" />}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-center">
                      <button
                        onClick={() => handleWeeklyGoalToggle(goal.id, !(goalProgress?.weeklyCompleted || false))}
                        className={`flex items-center space-x-3 px-6 py-3 rounded-lg border-2 transition-all ${
                          goalProgress?.weeklyCompleted
                            ? 'border-green-500 bg-green-50 text-green-700'
                            : 'border-gray-200 hover:border-gray-300 text-gray-600'
                        }`}
                      >
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          goalProgress?.weeklyCompleted
                            ? 'border-green-500 bg-green-500'
                            : 'border-gray-300'
                        }`}>
                          {goalProgress?.weeklyCompleted && <CheckCircle className="w-4 h-4 text-white" />}
                        </div>
                        <span className="font-medium">
                          {goalProgress?.weeklyCompleted ? 'Objectif accompli !' : 'Marquer comme accompli'}
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Badge de félicitations */}
          {isAllGoalsCompleted() && (
            <div className="mt-6 p-6 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl">
              <div className="flex items-center justify-center space-x-4">
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center">
                  <Award className="w-8 h-8 text-yellow-600" />
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-bold text-yellow-800 mb-1">🎉 Félicitations !</h3>
                  <p className="text-yellow-700">Vous avez accompli tous vos objectifs cette semaine !</p>
                  <div className="flex items-center justify-center space-x-1 mt-2">
                    <Star className="w-4 h-4 text-yellow-500 fill-current" />
                    <span className="text-sm font-medium text-yellow-600">Badge "Semaine Parfaite" débloqué</span>
                    <Star className="w-4 h-4 text-yellow-500 fill-current" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Badges obtenus */}
      {userBadges.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
            <Award className="w-6 h-6 text-yellow-600 mr-3" />
            Mes badges
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {userBadges.map((badge) => (
              <div key={badge.id} className={`p-4 rounded-lg border-2 ${badge.color} border-opacity-50`}>
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{badge.icon}</span>
                  <div>
                    <h3 className="font-semibold">{badge.name}</h3>
                    <p className="text-sm opacity-75">{badge.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Entry History */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">Historique des entrées</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {userEntries.slice().reverse().slice(0, 10).map((entry) => (
            <div key={entry.id} className="p-6 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-4">
                    <div className="text-lg font-semibold text-gray-800">{entry.weight} kg</div>
                    <div className="text-sm text-gray-500">
                      {new Date(entry.date).toLocaleDateString('fr-FR', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                  </div>
                  {entry.measurements && (
                    <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                      {entry.measurements.waist && <span>Tour de taille: {entry.measurements.waist}cm</span>}
                      {entry.measurements.chest && <span>Tour de poitrine: {entry.measurements.chest}cm</span>}
                      {entry.measurements.hips && <span>Tour de hanches: {entry.measurements.hips}cm</span>}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-800">
                      IMC: {calculateIMC(entry.weight, heightCm)}
                    </div>
                    <div className={`text-xs ${getIMCCategory(parseFloat(calculateIMC(entry.weight, heightCm))).color}`}>
                      {getIMCCategory(parseFloat(calculateIMC(entry.weight, heightCm))).text}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditModal(entry)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Modifier"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteEntry(entry.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Entry Modal */}
      {showAddEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">Nouvelle entrée</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                <input
                  type="date"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  value={newEntry.date}
                  onChange={(e) => setNewEntry({ ...newEntry, date: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Poids (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  value={newEntry.weight}
                  onChange={(e) => setNewEntry({ ...newEntry, weight: e.target.value })}
                  placeholder="Ex: 70.5"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tour de taille (cm)</label>
                  <input
                    type="number"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    value={newEntry.measurements.waist}
                    onChange={(e) => setNewEntry({
                      ...newEntry,
                      measurements: { ...newEntry.measurements, waist: e.target.value }
                    })}
                    placeholder="90"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tour de poitrine (cm)</label>
                  <input
                    type="number"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    value={newEntry.measurements.chest}
                    onChange={(e) => setNewEntry({
                      ...newEntry,
                      measurements: { ...newEntry.measurements, chest: e.target.value }
                    })}
                    placeholder="95"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tour de hanches (cm)</label>
                  <input
                    type="number"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    value={newEntry.measurements.hips}
                    onChange={(e) => setNewEntry({
                      ...newEntry,
                      measurements: { ...newEntry.measurements, hips: e.target.value }
                    })}
                    placeholder="100"
                  />
                </div>
              </div>
            </div>

            <div className="flex space-x-4 mt-6">
              <button
                onClick={() => setShowAddEntry(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleAddEntry}
                disabled={!newEntry.weight}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Ajouter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Entry Modal */}
      {showEditEntry && editingEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">Modifier l'entrée</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                <input
                  type="date"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={editingEntry.date}
                  onChange={(e) => setEditingEntry({ ...editingEntry, date: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Poids (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={editingEntry.weight}
                  onChange={(e) => setEditingEntry({ ...editingEntry, weight: e.target.value })}
                  placeholder="Ex: 70.5"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tour de taille (cm)</label>
                  <input
                    type="number"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={editingEntry.measurements?.waist || ''}
                    onChange={(e) => setEditingEntry({
                      ...editingEntry,
                      measurements: { ...editingEntry.measurements, waist: e.target.value }
                    })}
                    placeholder="90"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tour de poitrine (cm)</label>
                  <input
                    type="number"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={editingEntry.measurements?.chest || ''}
                    onChange={(e) => setEditingEntry({
                      ...editingEntry,
                      measurements: { ...editingEntry.measurements, chest: e.target.value }
                    })}
                    placeholder="95"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tour de hanches (cm)</label>
                  <input
                    type="number"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={editingEntry.measurements?.hips || ''}
                    onChange={(e) => setEditingEntry({
                      ...editingEntry,
                      measurements: { ...editingEntry.measurements, hips: e.target.value }
                    })}
                    placeholder="100"
                  />
                </div>
              </div>
            </div>

            <div className="flex space-x-4 mt-6">
              <button
                onClick={() => {
                  setShowEditEntry(false);
                  setEditingEntry(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleEditEntry}
                disabled={!editingEntry.weight}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}