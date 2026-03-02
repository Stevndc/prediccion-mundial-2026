import React, { useState, useEffect, useMemo } from 'react';
import groupsData from './data/equipos.json';
import { Trophy, RotateCcw, CheckCircle2, Medal } from 'lucide-react';
import Confetti from 'react-confetti';

const MATCH_RULES = [
    // Lado Izquierdo (Indices 0-7)
    { id: 79, t1: '1A', t2: 'M3' }, { id: 74, t1: '1E', t2: 'M3' },
    { id: 75, t1: '1F', t2: '2C' }, { id: 76, t1: '1E', t2: '2F' },
    { id: 73, t1: '2A', t2: '2B' }, { id: 78, t1: '2E', t2: '2I' },
    { id: 77, t1: '1I', t2: 'M3' }, { id: 80, t1: '1L', t2: 'M3' },
    // Lado Derecho (Indices 8-15)
    { id: 81, t1: '1D', t2: 'M3' }, { id: 82, t1: '1G', t2: 'M3' },
    { id: 83, t1: '2K', t2: '2L' }, { id: 84, t1: '1H', t2: '2J' },
    { id: 85, t1: '1B', t2: 'M3' }, { id: 86, t1: '1J', t2: '2H' },
    { id: 87, t1: '1K', t2: 'M3' }, { id: 88, t1: '2D', t2: '2G' }
];

const TeamFlag = ({ team, size = "small" }) => {
    if (!team) return null;
    if (team.imagen) {
        const flagUrl = new URL(`./banderas/${team.imagen}`, import.meta.url).href;
        return <img src={flagUrl} alt={team.nombre} className={`flag-img ${size}`} />;
    }
    return <span className="flag">{team.bandera}</span>;
};

function App() {
    const [positions, setPositions] = useState({});
    const [bracket, setBracket] = useState({
        r16: Array(16).fill(null),
        qf: Array(8).fill(null),
        sf: Array(4).fill(null),
        final: Array(2).fill(null),
        thirdPlace: Array(2).fill(null),
        winner: null,
        thirdWinner: null
    });

    const teamsByPos = useMemo(() => {
        const map = {};
        Object.entries(positions).forEach(([group, posMap]) => {
            Object.entries(posMap).forEach(([pos, team]) => { map[`${pos}${group}`] = team; });
        });
        return map;
    }, [positions]);

    const bestThirds = useMemo(() => {
        return Object.entries(positions).filter(([_, posMap]) => posMap[3]).map(([group, posMap]) => ({ ...posMap[3], group }));
    }, [positions]);

    const totalQualifiers = useMemo(() => {
        let direct = 0;
        Object.values(positions).forEach(pMap => {
            if (pMap[1]) direct++;
            if (pMap[2]) direct++;
        });
        return direct + Math.min(bestThirds.length, 8);
    }, [positions, bestThirds]);

    const setTeamPosition = (groupName, pos, team) => {
        setPositions(prev => {
            const groupPos = { ...prev[groupName] } || {};
            Object.keys(groupPos).forEach(k => { if (groupPos[k]?.nombre === team.nombre) delete groupPos[k]; });
            if (parseInt(pos) === 3) {
                const otherThirds = Object.entries(prev).filter(([g, pMap]) => g !== groupName && pMap[3]).length;
                if (otherThirds >= 8) { alert("Solo 8 mejores terceros oficiales."); return prev; }
            }
            groupPos[pos] = team;
            return { ...prev, [groupName]: groupPos };
        });
    };

    const advance = (team, nextStage, nextIndex, currentStage = null, currentIndex = null) => {
        if (!team) return;
        setBracket(prev => {
            const next = { ...prev };

            if (currentStage === 'sf') {
                const matchIndex = currentIndex * 2;
                const team1 = prev.sf[matchIndex];
                const team2 = prev.sf[matchIndex + 1];
                const loser = team1?.nombre === team.nombre ? team2 : team1;

                if (loser) {
                    const newThird = [...next.thirdPlace];
                    newThird[currentIndex] = loser;
                    next.thirdPlace = newThird;
                }
            }

            if (nextStage === 'winner') {
                next.winner = team;
            } else if (nextStage === 'thirdWinner') {
                next.thirdWinner = team;
            } else {
                const stageData = [...next[nextStage]];
                stageData[nextIndex] = team;
                next[nextStage] = stageData;
            }
            return next;
        });
    };

    const resetSimulation = () => {
        setPositions({});
        setBracket({ r16: Array(16).fill(null), qf: Array(8).fill(null), sf: Array(4).fill(null), final: Array(2).fill(null), thirdPlace: Array(2).fill(null), winner: null, thirdWinner: null });
    };

    const r32Matches = useMemo(() => {
        return MATCH_RULES.map((rule, idx) => {
            const t1 = teamsByPos[rule.t1] || null;
            let t2 = teamsByPos[rule.t2] || null;
            if (rule.t2 === 'M3') {
                const thirdIdx = MATCH_RULES.slice(0, idx).filter(r => r.t2 === 'M3').length;
                t2 = bestThirds[thirdIdx] || null;
            }
            return { id: rule.id, teams: [t1, t2], rule: rule };
        });
    }, [teamsByPos, bestThirds]);

    const handleDragStart = (e, team) => { if (team) e.dataTransfer.setData('team', JSON.stringify(team)); };

    const handleDrop = (e, stage, idx) => {
        e.preventDefault();
        try {
            const team = JSON.parse(e.dataTransfer.getData('team'));
            advance(team, stage, idx);
        } catch (err) { }
    };

    const renderMatch = (match, matchIdx) => {
        const isReady = match.teams[0] && match.teams[1];
        return (
            <div key={match.id} className="match-box">
                <div className="match-header"><span>#{match.id}</span><span>{match.rule.t1} vs {match.rule.t2}</span></div>
                {match.teams.map((t, i) => (
                    <div
                        key={i}
                        className={`match-team ${!t ? 'empty' : 'winner-ready'}`}
                        draggable={!!t && isReady}
                        onDragStart={e => handleDragStart(e, t)}
                        onClick={() => isReady && advance(t, 'r16', matchIdx)}
                        title={isReady ? "Click para avanzar" : ""}
                    >
                        <TeamFlag team={t} />
                        <span className="name">{t?.nombre || '-'}</span>
                    </div>
                ))}
            </div>
        );
    };

    const renderSlotPair = (stage, pairIdx, label, nextStage) => {
        const t1 = bracket[stage][pairIdx * 2];
        const t2 = bracket[stage][pairIdx * 2 + 1];
        const isReady = t1 && t2;

        return (
            <div key={`${stage}-${pairIdx}`} className="match-box">
                <div className="match-header">{label}</div>
                <div
                    className={`match-team ${!t1 ? 'empty' : 'winner-ready'}`}
                    onDrop={e => handleDrop(e, stage, pairIdx * 2)}
                    onDragOver={e => e.preventDefault()}
                    draggable={!!t1 && isReady}
                    onDragStart={e => handleDragStart(e, t1)}
                    onClick={() => isReady && advance(t1, nextStage, pairIdx, stage, pairIdx)}
                >
                    <TeamFlag team={t1} />
                    <span className="name">{t1?.nombre || 'Soltar...'}</span>
                </div>
                <div
                    className={`match-team ${!t2 ? 'empty' : 'winner-ready'}`}
                    onDrop={e => handleDrop(e, stage, pairIdx * 2 + 1)}
                    onDragOver={e => e.preventDefault()}
                    draggable={!!t2 && isReady}
                    onDragStart={e => handleDragStart(e, t2)}
                    onClick={() => isReady && advance(t2, nextStage, pairIdx, stage, pairIdx)}
                >
                    <TeamFlag team={t2} />
                    <span className="name">{t2?.nombre || 'Soltar...'}</span>
                </div>
            </div>
        );
    };

    return (
        <div className="app-container">
            {bracket.winner && <Confetti width={window.innerWidth} height={window.innerHeight} recycle={false} />}
            <header>
                <div className="header-content">
                    <Trophy size={28} className="trophy-icon" />
                    <h1>Simulador Mundial 2026</h1>
                </div>
            </header>

            <main>
                <section className="welcome-section">
                    <div className="welcome-card">
                        <div className="welcome-images">
                            <img src={new URL('./banderas/copa-mundial.png', import.meta.url).href} alt="Copa Mundial" className="hero-img" />
                            <img src={new URL('./banderas/copa-mundial (1).png', import.meta.url).href} alt="Copa Mundial" className="hero-img desktop-only" />
                        </div>
                        <div className="welcome-info">
                            <h2>¡Haz tu predicción oficial! 🏆</h2>
                            <p>Bienvenido al simulador más completo del Mundial 2026. Es hora de jugar y predecir quién levantará la copa.</p>
                            <div className="instruction-steps">
                                <div className="step">
                                    <span className="step-num">1</span>
                                    <p>Selecciona el <strong>1º y 2º</strong> puesto de cada grupo.</p>
                                </div>
                                <div className="step">
                                    <span className="step-num">2</span>
                                    <p>Elige al <strong>3º lugar</strong> de cada grupo para los mejores terceros.</p>
                                </div>
                                <div className="step">
                                    <span className="step-num">3</span>
                                    <p>¡Avanza en el <strong>Bracket</strong> hasta encontrar al campeón!</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="group-stage">
                    <div className="stage-header">
                        <h2>Fase de Grupos</h2>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <div className="progress-card">
                                <CheckCircle2 size={16} color={totalQualifiers === 32 ? '#10b981' : '#64748b'} />
                                <span>Clasificados: <strong>{totalQualifiers} / 32</strong></span>
                            </div>
                            <div className="progress-card">
                                <Medal size={16} color={bestThirds.length === 8 ? '#f59e0b' : '#64748b'} />
                                <span>Mejores 3º: <strong>{bestThirds.length} / 8</strong></span>
                            </div>
                        </div>
                    </div>
                    <div className="groups-grid">
                        {groupsData.grupos.map(g => (
                            <div key={g.grupo} className="group-card">
                                <h3>Grupo {g.grupo}</h3>
                                <div className="row-header"><span>Equipo</span><span>1º</span><span>2º</span><span>3º</span></div>
                                {g.equipos.map(eq => {
                                    const pos = Object.keys(positions[g.grupo] || {}).find(k => positions[g.grupo][k].nombre === eq.nombre);
                                    return (
                                        <div key={eq.nombre} className="team-row-official">
                                            <div className="team-info"><TeamFlag team={eq} /><span className="name">{eq.nombre}</span></div>
                                            {[1, 2, 3].map(p => (
                                                <div key={p} className="pos-radio">
                                                    <label><input type="radio" checked={parseInt(pos) === p} onChange={() => setTeamPosition(g.grupo, p, eq)} /><span className={`radio-btn p${p}`}>{p}</span></label>
                                                </div>
                                            ))}
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </section>

                <section className="bracket-section">
                    <h2>Cuadro Final Oficial (32 Selecciones)</h2>
                    <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1rem' }}>Avanza haciendo clic en el ganador o arrastrando el equipo</p>
                    <div className="bracket-split-view">
                        {/* LADO IZQUIERDO */}
                        <div className="bracket-side left">
                            <div className="bracket-col">{r32Matches.slice(0, 8).map((m, i) => renderMatch(m, i))}</div>
                            <div className="bracket-col">
                                {renderSlotPair('r16', 0, 'MATCH 89', 'qf')}
                                {renderSlotPair('r16', 1, 'MATCH 90', 'qf')}
                                {renderSlotPair('r16', 2, 'MATCH 91', 'qf')}
                                {renderSlotPair('r16', 3, 'MATCH 92', 'qf')}
                            </div>
                            <div className="bracket-col">
                                {renderSlotPair('qf', 0, 'MATCH 97', 'sf')}
                                {renderSlotPair('qf', 1, 'MATCH 98', 'sf')}
                            </div>
                        </div>

                        <div className="bracket-center">
                            {renderSlotPair('sf', 0, 'SEMI 1', 'final')}

                            <div className="winner-podium" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                                <div className="champion-slot"
                                    onDrop={e => { e.preventDefault(); try { advance(JSON.parse(e.dataTransfer.getData('team')), 'winner', 0); } catch (err) { } }}
                                    onDragOver={e => e.preventDefault()}
                                    title="Soltar campeón">
                                    {bracket.winner ? (
                                        <div style={{ textAlign: 'center' }}>
                                            <TeamFlag team={bracket.winner} size="large" />
                                            <div style={{ fontWeight: 800, color: 'var(--accent-color)', fontSize: '1.1rem' }}>{bracket.winner.nombre}</div>
                                            <div style={{ fontSize: '0.6rem', letterSpacing: '2px', color: 'var(--accent-color)' }}>CAMPEÓN</div>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: 0.3 }}>
                                            <Trophy size={40} className="big-trophy" />
                                            <span style={{ fontSize: '0.6rem', fontWeight: 800 }}>FINAL</span>
                                        </div>
                                    )}
                                </div>

                                <div className="match-box third-match" style={{ width: '150px', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                                    <div className="match-header" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>TERCER PUESTO</div>
                                    {[0, 1].map(i => {
                                        const t = bracket.thirdPlace[i];
                                        const isReady = bracket.thirdPlace[0] && bracket.thirdPlace[1];
                                        return (
                                            <div
                                                key={i}
                                                className={`match-team ${!t ? 'empty' : 'winner-ready'}`}
                                                onClick={() => isReady && advance(t, 'thirdWinner', 0)}
                                            >
                                                <TeamFlag team={t} />
                                                <span className="name">{t?.nombre || 'Perdedor Semi'}</span>
                                            </div>
                                        );
                                    })}
                                    {bracket.thirdWinner && (
                                        <div style={{ padding: '4px', background: 'rgba(245, 158, 11, 0.2)', textAlign: 'center', fontSize: '0.7rem', fontWeight: 800, color: '#f59e0b', borderTop: '1px solid rgba(245, 158, 11, 0.2)' }}>
                                            🥉 {bracket.thirdWinner.nombre}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {renderSlotPair('sf', 1, 'SEMI 2', 'final')}
                            <div style={{ marginTop: '1rem' }}>{renderSlotPair('final', 0, 'GRAN FINAL', 'winner')}</div>
                        </div>

                        {/* LADO DERECHO */}
                        <div className="bracket-side right" style={{ flexDirection: 'row-reverse' }}>
                            <div className="bracket-col">{r32Matches.slice(8, 16).map((m, i) => renderMatch(m, i + 8))}</div>
                            <div className="bracket-col">
                                {renderSlotPair('r16', 4, 'MATCH 93', 'qf')}
                                {renderSlotPair('r16', 5, 'MATCH 94', 'qf')}
                                {renderSlotPair('r16', 6, 'MATCH 95', 'qf')}
                                {renderSlotPair('r16', 7, 'MATCH 96', 'qf')}
                            </div>
                            <div className="bracket-col">
                                {renderSlotPair('qf', 2, 'MATCH 99', 'sf')}
                                {renderSlotPair('qf', 3, 'MATCH 100', 'sf')}
                            </div>
                        </div>
                    </div>
                </section>

                <div className="btn-container"><button className="reset-simulation-btn" onClick={resetSimulation}><RotateCcw size={14} /> Reiniciar Todo</button></div>
            </main>
            <footer><p>&copy; 2026 Simulador Mundial - 🏁 Suerte en tu predicción</p></footer>
        </div>
    );
}
export default App;
