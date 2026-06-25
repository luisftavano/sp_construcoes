import {
  doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc,
  collection, query, where, orderBy, getDocs, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../firebase'

// Empresa
export async function getEmpresa(uid) {
  const snap = await getDoc(doc(db, 'empresas', uid))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

export async function saveEmpresa(uid, data) {
  await setDoc(doc(db, 'empresas', uid), { ...data, uid, criado_em: serverTimestamp() })
}

export async function updateEmpresa(uid, data) {
  await updateDoc(doc(db, 'empresas', uid), { ...data, atualizado_em: serverTimestamp() })
}

// Clientes
export async function getClientes(empresaId) {
  const snap = await getDocs(collection(db, 'empresas', empresaId, 'clientes'))
  const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }))
  return docs.sort((a, b) => (b.criado_em?.seconds ?? 0) - (a.criado_em?.seconds ?? 0))
}

export async function getCliente(empresaId, clienteId) {
  const snap = await getDoc(doc(db, 'empresas', empresaId, 'clientes', clienteId))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

export async function addCliente(empresaId, data) {
  return addDoc(collection(db, 'empresas', empresaId, 'clientes'), {
    ...data,
    criado_em: serverTimestamp(),
  })
}

export async function updateCliente(empresaId, clienteId, data) {
  await updateDoc(doc(db, 'empresas', empresaId, 'clientes', clienteId), data)
}

export async function deleteCliente(empresaId, clienteId) {
  await deleteDoc(doc(db, 'empresas', empresaId, 'clientes', clienteId))
}

// Atendimentos
export async function getAtendimentos(empresaId, clienteId) {
  const q = query(
    collection(db, 'empresas', empresaId, 'atendimentos'),
    where('cliente_id', '==', clienteId)
  )
  const snap = await getDocs(q)
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => {
      const ta = a.criado_em?.toMillis?.() ?? 0
      const tb = b.criado_em?.toMillis?.() ?? 0
      return tb - ta
    })
}

export async function getTodosAtendimentos(empresaId) {
  const q = query(
    collection(db, 'empresas', empresaId, 'atendimentos'),
    orderBy('criado_em', 'desc')
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function addAtendimento(empresaId, data) {
  return addDoc(collection(db, 'empresas', empresaId, 'atendimentos'), {
    ...data,
    criado_em: serverTimestamp(),
  })
}

// Agendamentos (horários futuros)
export async function getAgendamentos(empresaId) {
  const q = query(
    collection(db, 'empresas', empresaId, 'agendamentos'),
    orderBy('data'),
    orderBy('hora_inicio')
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function getAgendamentosHoje(empresaId) {
  const hoje = new Date().toISOString().slice(0, 10)
  const q = query(
    collection(db, 'empresas', empresaId, 'agendamentos'),
    where('data', '==', hoje),
    orderBy('hora_inicio')
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function addAgendamento(empresaId, data) {
  return addDoc(collection(db, 'empresas', empresaId, 'agendamentos'), {
    ...data,
    criado_em: serverTimestamp(),
  })
}

export async function updateAgendamento(empresaId, id, data) {
  await updateDoc(doc(db, 'empresas', empresaId, 'agendamentos', id), data)
}

export async function deleteAgendamento(empresaId, id) {
  await deleteDoc(doc(db, 'empresas', empresaId, 'agendamentos', id))
}

// Serviços (catálogo de preços)
export async function getServicos(empresaId) {
  const q = query(
    collection(db, 'empresas', empresaId, 'servicos'),
    orderBy('nome')
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function addServico(empresaId, data) {
  return addDoc(collection(db, 'empresas', empresaId, 'servicos'), {
    ...data,
    criado_em: serverTimestamp(),
  })
}

export async function updateServico(empresaId, id, data) {
  await updateDoc(doc(db, 'empresas', empresaId, 'servicos', id), data)
}

export async function deleteServico(empresaId, id) {
  await deleteDoc(doc(db, 'empresas', empresaId, 'servicos', id))
}

// Estoque
export async function getEstoque(empresaId) {
  const q = query(
    collection(db, 'empresas', empresaId, 'estoque'),
    orderBy('nome')
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function addEstoqueItem(empresaId, data) {
  return addDoc(collection(db, 'empresas', empresaId, 'estoque'), {
    ...data,
    criado_em: serverTimestamp(),
    atualizado_em: serverTimestamp(),
  })
}

export async function updateEstoqueItem(empresaId, id, data) {
  await updateDoc(doc(db, 'empresas', empresaId, 'estoque', id), {
    ...data,
    atualizado_em: serverTimestamp(),
  })
}

export async function deleteEstoqueItem(empresaId, id) {
  await deleteDoc(doc(db, 'empresas', empresaId, 'estoque', id))
}

// Despesas
export async function getDespesas(empresaId) {
  const q = query(
    collection(db, 'empresas', empresaId, 'despesas'),
    orderBy('data', 'desc')
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function addDespesa(empresaId, data) {
  return addDoc(collection(db, 'empresas', empresaId, 'despesas'), {
    ...data,
    criado_em: serverTimestamp(),
  })
}

export async function deleteDespesa(empresaId, id) {
  await deleteDoc(doc(db, 'empresas', empresaId, 'despesas', id))
}
