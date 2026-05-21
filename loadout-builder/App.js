import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Modal,
  StyleSheet, SafeAreaView, StatusBar, Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AGENTS = [
  { id: '1', name: 'Vex',       role: 'Striker'   },
  { id: '2', name: 'Kael',      role: 'Warrior'   },
  { id: '3', name: 'Solin',     role: 'Medic'     },
  { id: '4', name: 'Thornwall', role: 'Tank'      },
  { id: '5', name: 'Nyx',       role: 'Assassin'  },
];

const BEHAVIORS = [
  'Attack Weakest',
  'Attack Strongest',
  'Protect Allies',
  'Execute Low HP',
  'Support',
];

const STORAGE_KEY = '@8gents_loadout';

const C = {
  bg:         '#0d0f14',
  surface:    '#161b26',
  card:       '#1c2333',
  accent:     '#4f8ef7',
  accentDim:  '#1e3460',
  text:       '#e2e8f0',
  muted:      '#64748b',
  border:     '#2d3748',
  danger:     '#e53e3e',
};

export default function App() {
  const [slots, setSlots] = useState([null, null, null]);
  const [agentPickerSlot, setAgentPickerSlot]     = useState(null);
  const [behaviorPickerSlot, setBehaviorPickerSlot] = useState(null);

  useEffect(() => { loadConfig(); }, []);

  const loadConfig = async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved) setSlots(JSON.parse(saved));
    } catch (_) {}
  };

  const persist = async (next) => {
    try { await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)); }
    catch (_) {}
  };

  const usedIds = () => slots.filter(Boolean).map(s => s.agentId);

  const pickAgent = (agentId) => {
    const agent = AGENTS.find(a => a.id === agentId);
    const next  = [...slots];
    next[agentPickerSlot] = {
      agentId,
      agentName: agent.name,
      agentRole: agent.role,
      behavior:  next[agentPickerSlot]?.behavior ?? BEHAVIORS[0],
    };
    setSlots(next); persist(next); setAgentPickerSlot(null);
  };

  const pickBehavior = (behavior) => {
    const next = [...slots];
    next[behaviorPickerSlot] = { ...next[behaviorPickerSlot], behavior };
    setSlots(next); persist(next); setBehaviorPickerSlot(null);
  };

  const removeSlot = (i) => {
    const next = [...slots];
    next[i] = null;
    setSlots(next); persist(next);
  };

  const configured = slots.filter(Boolean);

  return (
    <SafeAreaView style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View style={s.header}>
          <Text style={s.title}>Loadout Builder</Text>
          <Text style={s.subtitle}>{configured.length} / 3 8gents configured</Text>
        </View>

        {/* ── Slots ── */}
        {slots.map((slot, i) => (
          <View key={i} style={s.slotCard}>
            <View style={s.slotHead}>
              <View style={s.badge}><Text style={s.badgeText}>{i + 1}</Text></View>
              <Text style={s.slotLabel}>Slot {i + 1}</Text>
              {slot && (
                <TouchableOpacity onPress={() => removeSlot(i)}>
                  <Text style={s.removeText}>Remove</Text>
                </TouchableOpacity>
              )}
            </View>

            {slot ? (
              <View style={s.slotBody}>
                {/* Agent row */}
                <TouchableOpacity
                  style={s.selectRow}
                  onPress={() => setAgentPickerSlot(i)}
                  activeOpacity={0.75}
                >
                  <View>
                    <Text style={s.rowCap}>8GENT</Text>
                    <Text style={s.rowVal}>{slot.agentName}</Text>
                    <Text style={s.rowSub}>{slot.agentRole}</Text>
                  </View>
                  <Text style={s.chevron}>▾</Text>
                </TouchableOpacity>

                {/* Behavior row */}
                <TouchableOpacity
                  style={[s.selectRow, { marginTop: 8 }]}
                  onPress={() => setBehaviorPickerSlot(i)}
                  activeOpacity={0.75}
                >
                  <View>
                    <Text style={s.rowCap}>BEHAVIOR PRIORITY</Text>
                    <Text style={s.rowVal}>{slot.behavior}</Text>
                  </View>
                  <Text style={s.chevron}>▾</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={s.addBtn} onPress={() => setAgentPickerSlot(i)} activeOpacity={0.75}>
                <Text style={s.addBtnText}>+ Add 8gent</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}

        {/* ── Summary Card ── */}
        <View style={s.summaryCard}>
          <Text style={s.summaryTitle}>Team Summary</Text>

          {configured.length === 0 ? (
            <Text style={s.summaryEmpty}>
              No 8gents configured yet.{'\n'}Add units above to build your loadout.
            </Text>
          ) : (
            configured.map((slot, i) => (
              <View
                key={i}
                style={[s.summaryRow, i < configured.length - 1 && s.summaryRowBorder]}
              >
                <View style={s.summaryLeft}>
                  <Text style={s.summaryNum}>#{i + 1}</Text>
                  <View>
                    <Text style={s.summaryName}>{slot.agentName}</Text>
                    <Text style={s.summaryRole}>{slot.agentRole}</Text>
                  </View>
                </View>
                <View style={s.behaviorTag}>
                  <Text style={s.behaviorTagText} numberOfLines={2}>{slot.behavior}</Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* ── Agent Picker Modal ── */}
      <Modal visible={agentPickerSlot !== null} transparent animationType="slide">
        <View style={s.overlay}>
          <View style={s.sheet}>
            <Text style={s.sheetTitle}>Select 8gent</Text>
            <Text style={s.sheetSub}>Slot {(agentPickerSlot ?? 0) + 1}</Text>

            {AGENTS.map(agent => {
              const taken    = usedIds().includes(agent.id) && slots[agentPickerSlot]?.agentId !== agent.id;
              const selected = slots[agentPickerSlot]?.agentId === agent.id;
              return (
                <TouchableOpacity
                  key={agent.id}
                  style={[s.sheetItem, taken && s.sheetItemDim]}
                  onPress={() => !taken && pickAgent(agent.id)}
                  activeOpacity={taken ? 1 : 0.75}
                >
                  <View>
                    <Text style={[s.sheetItemName, taken && { color: C.muted }]}>{agent.name}</Text>
                    <Text style={s.sheetItemSub}>{agent.role}</Text>
                  </View>
                  {taken    && <Text style={s.tagMuted}>In use</Text>}
                  {selected && <Text style={s.tagAccent}>✓</Text>}
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity style={s.cancelBtn} onPress={() => setAgentPickerSlot(null)}>
              <Text style={s.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Behavior Picker Modal ── */}
      <Modal visible={behaviorPickerSlot !== null} transparent animationType="slide">
        <View style={s.overlay}>
          <View style={s.sheet}>
            <Text style={s.sheetTitle}>Select Behavior</Text>
            <Text style={s.sheetSub}>
              {behaviorPickerSlot !== null ? slots[behaviorPickerSlot]?.agentName : ''}
            </Text>

            {BEHAVIORS.map(b => {
              const selected = behaviorPickerSlot !== null && slots[behaviorPickerSlot]?.behavior === b;
              return (
                <TouchableOpacity
                  key={b}
                  style={s.sheetItem}
                  onPress={() => pickBehavior(b)}
                  activeOpacity={0.75}
                >
                  <Text style={s.sheetItemName}>{b}</Text>
                  {selected && <Text style={s.tagAccent}>✓</Text>}
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity style={s.cancelBtn} onPress={() => setBehaviorPickerSlot(null)}>
              <Text style={s.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 16, paddingBottom: 48 },

  // Header
  header:   { marginBottom: 24, marginTop: 8 },
  title:    { fontSize: 30, fontWeight: '800', color: C.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: C.muted, marginTop: 4 },

  // Slot card
  slotCard: {
    backgroundColor: C.surface,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  slotHead: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    paddingBottom: 8,
  },
  badge:     { width: 24, height: 24, borderRadius: 12, backgroundColor: C.accentDim, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  badgeText: { color: C.accent, fontSize: 12, fontWeight: '700' },
  slotLabel: { flex: 1, fontSize: 13, color: C.muted, fontWeight: '600', letterSpacing: 0.5 },
  removeText:{ color: C.danger, fontSize: 13, fontWeight: '600' },

  slotBody: { paddingHorizontal: 14, paddingBottom: 14 },
  selectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.card,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  rowCap:  { fontSize: 10, color: C.muted, fontWeight: '700', letterSpacing: 1 },
  rowVal:  { fontSize: 18, color: C.text,  fontWeight: '700', marginTop: 2 },
  rowSub:  { fontSize: 12, color: C.muted, marginTop: 1 },
  chevron: { color: C.accent, fontSize: 16 },

  addBtn: {
    margin: 14,
    marginTop: 8,
    paddingVertical: 16,
    borderRadius: 10,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: C.accentDim,
    alignItems: 'center',
  },
  addBtnText: { color: C.accent, fontSize: 15, fontWeight: '600' },

  // Summary card
  summaryCard: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 18,
    marginTop: 8,
    borderWidth: 1,
    borderColor: C.border,
  },
  summaryTitle: { fontSize: 16, fontWeight: '700', color: C.text, marginBottom: 14 },
  summaryEmpty: { color: C.muted, fontSize: 14, textAlign: 'center', lineHeight: 22, paddingVertical: 12 },
  summaryRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  summaryRowBorder: { borderBottomWidth: 1, borderBottomColor: C.border },
  summaryLeft:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  summaryNum:   { color: C.accent, fontSize: 13, fontWeight: '700', width: 22 },
  summaryName:  { fontSize: 16, fontWeight: '700', color: C.text },
  summaryRole:  { fontSize: 12, color: C.muted, marginTop: 1 },
  behaviorTag:  { backgroundColor: C.accentDim, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, maxWidth: 150 },
  behaviorTagText: { color: C.accent, fontSize: 12, fontWeight: '600' },

  // Modal
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 44 : 28,
    borderTopWidth: 1,
    borderColor: C.border,
  },
  sheetTitle:    { fontSize: 20, fontWeight: '800', color: C.text },
  sheetSub:      { fontSize: 14, color: C.muted, marginTop: 4, marginBottom: 16 },
  sheetItem:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.card, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16, marginBottom: 8 },
  sheetItemDim:  { opacity: 0.4 },
  sheetItemName: { fontSize: 16, fontWeight: '600', color: C.text },
  sheetItemSub:  { fontSize: 12, color: C.muted, marginTop: 2 },
  tagMuted:      { color: C.muted, fontSize: 12 },
  tagAccent:     { color: C.accent, fontSize: 18, fontWeight: '700' },
  cancelBtn:     { marginTop: 8, paddingVertical: 14, alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: C.border },
  cancelText:    { color: C.muted, fontSize: 16, fontWeight: '600' },
});
