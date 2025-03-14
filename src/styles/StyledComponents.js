import styled from 'styled-components';

export const Container = styled.div`
    display: flex;
    gap: 2rem;
    align-items: stretch;
    min-height: 100vh;
    
    @media (max-width: 768px) {
        flex-direction: column;
        gap: 1rem;
    }
`;

export const FormSection = styled.div`
    flex: 1;
    min-width: 400px;
    max-width: 600px;
    
    @media (max-width: 768px) {
        min-width: 100%;
    }
`;

export const JsonSection = styled.div`
    flex: 1;
    position: sticky;
    top: 20px;
    display: flex;
    flex-direction: column;
    height: calc(100vh - 40px);
    
    @media (max-width: 768px) {
        position: static;
        height: auto;
    }
`;