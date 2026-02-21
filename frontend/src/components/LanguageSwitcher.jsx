import React from 'react';
import { useTranslation } from 'react-i18next';

export default function LanguageSwitcher() {
    const { i18n } = useTranslation();

    const changeLanguage = (lng) => {
        i18n.changeLanguage(lng);
    };

    return (
        <select
            value={i18n.language}
            onChange={(e) => changeLanguage(e.target.value)}
            style={{
                padding: '0.4rem 0.8rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '0.9rem',
                cursor: 'pointer',
                backgroundColor: 'white',
                color: '#333'
            }}
        >
            <option value="en">English</option>
            <option value="ar">العربية</option>
        </select>
    );
}
