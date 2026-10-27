import { useContext } from 'react';
import { WorkContext } from '../context/appContexts';

export function useMyWork() { return useContext(WorkContext); }
