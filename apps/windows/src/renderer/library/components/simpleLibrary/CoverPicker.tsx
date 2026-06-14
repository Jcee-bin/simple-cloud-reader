// ==LICENSE-BEGIN==
// Copyright 2017 European Digital Reading Lab. All rights reserved.
// Licensed to the Readium Foundation under one or more contributor license agreements.
// Use of this source code is governed by a BSD-style license
// that can be found in the LICENSE file exposed on Github (readium) in the project repository.
// ==LICENSE-END==

import * as React from "react";
import { CustomCover } from "readium-desktop/common/models/custom-cover";
import * as styles from "readium-desktop/renderer/assets/styles/components/simpleLibrary.scss";
import { apiAction } from "readium-desktop/renderer/library/apiAction";
import { COVER_PRESETS } from "./coverPresets";

interface IProps {
    identifier: string;
    onSelect: (identifier: string, cover: CustomCover) => void;
    onClose: () => void;
}

const CoverPicker: React.FC<IProps> = ({ identifier, onSelect, onClose }) => {
    const ref = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                onClose();
            }
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [onClose]);

    const pickImage = () => {
        apiAction("publication/selectCoverImage", identifier)
            .catch((e) => console.error("selectCoverImage error", e));
        onClose();
    };

    return (
        <div ref={ref} className={styles.cover_picker} role="dialog" aria-label="Choose cover">
            <button
                type="button"
                className={styles.cover_photo_btn}
                onClick={pickImage}
                title="Choose image from file"
            >
                🖼
            </button>
            {COVER_PRESETS.map((preset, i) => (
                <button
                    key={i}
                    type="button"
                    className={styles.cover_preset}
                    style={{ background: `linear-gradient(${preset.topColor}, ${preset.bottomColor})` }}
                    aria-label={`Cover color option ${i + 1}`}
                    onClick={() => { onSelect(identifier, preset); onClose(); }}
                />
            ))}
        </div>
    );
};

export default CoverPicker;
